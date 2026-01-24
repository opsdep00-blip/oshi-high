/**
 * Firebase Admin initializer
 * - Loads service account credentials from environment variables
 * - Handles escaped newlines in private key
 * - Reuses existing app instance to avoid duplicates
 */
import { App, cert, getApps, initializeApp } from "firebase-admin/app";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let firebaseApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (firebaseApp) return firebaseApp;
  const existing = getApps()[0];
  if (existing) {
    firebaseApp = existing;
    return firebaseApp;
  }

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const rawPrivateKey = requireEnv("FIREBASE_PRIVATE_KEY");

  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  firebaseApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });

  return firebaseApp;
}

export async function getFirebaseAccessToken(): Promise<string> {
  const app = getFirebaseAdminApp();
  const credential: any = app.options.credential;

  if (!credential || typeof credential.getAccessToken !== "function") {
    throw new Error("Firebase credential does not support access tokens");
  }

  const { access_token: accessToken } = await credential.getAccessToken();
  if (!accessToken) throw new Error("Failed to obtain Firebase access token");
  return accessToken;
}
