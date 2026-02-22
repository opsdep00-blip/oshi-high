/**
 * SMS Verification Code Sending Module
 *
 * @instructions.md に基づき実装：
 * - 開発環境（ENABLE_SMS_MOCK=true）: console.log でモック
 * - 本番環境: Firebase Auth、Twilio 等で実送信（将来実装）
 *
 * Handles sending verification codes via SMS.
 * In development mode (ENABLE_SMS_MOCK=true), logs to console instead of sending.
 * In production, uses Firebase Admin SDK, Twilio, or alternative SMS provider.
 */
import * as logger from "@/lib/logger"; 

type SmsSendResult = {
  sessionInfo?: string;
};

/**
 * Send verification code via SMS
 *
 * @param phoneHash - Hashed phone number (never store raw phone number)
 * @param phone - Raw phone number (送信時にのみ使用し、保存しない)
 * @param code - 6-digit verification code
 * @returns Promise that resolves when SMS is sent (or logged in mock mode)
 *
 * @example
 * ```typescript
 * await sendVerificationCode("sha256hash123...", "123456");
 * // In mock mode: console.log 「【開発用】送信先ハッシュ: ..., 認証コード: 123456」
 * // In production: sends via Firebase Auth, Twilio, etc.
 * ```
 */
export async function sendVerificationCode(params: {
  phoneHash: string;
  phone?: string;
  code: string;
}): Promise<SmsSendResult> {
  const { phoneHash, phone, code } = params;

  if (process.env.ENABLE_SMS_MOCK === "true") {
    (await import("@/lib/logger")).info(`【開発用】送信先ハッシュ: ${phoneHash}, 認証コード: ${code}`);
    return Promise.resolve({});
  }

  const provider = (process.env.SMS_PROVIDER || "firebase").toLowerCase();

  if (!phone) {
    logger.error("[SMS][missing-phone] phone is required when mock is disabled", {
      provider,
      phoneHash,
    });
    throw new Error("Phone number is required to send SMS");
  }

  try {
    if (provider === "firebase") {
      // Firebase Auth の仕様上、サーバーサイドからのSMS送信はできません。
      throw new Error("Firebase SMS sending cannot be done from server-side. Use Firebase JS SDK on the client-side.");
    }
    throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[SMS][${provider}] send failed`, {
      provider,
      message,
    });
    throw new Error("Failed to send verification code");
  }
}

/**
 * Production SMS sending using Firebase Admin SDK, Twilio, or alternative provider
 *
 * @param phoneHash - Hashed phone number
 * @param code - 6-digit verification code
 * @internal
 *
 * 将来実装予定:
 * - Firebase Admin SDK (Authentication API)
 * - Twilio SMS API
 * - AWS SNS
 * - Google Cloud SMS API
 * - SendGrid
 *
 * TODO: Implement actual SMS sending
 * 
 * Implementation template examples:
 * 
 * @example Firebase Admin SDK (when available)
 * ```typescript
 * import * as admin from 'firebase-admin';
 * 
 * async function sendVerificationCodeProduction(phoneHash: string, code: string) {
 *   // VerificationToken から生の電話番号を復元
 *   const token = await prisma.verificationToken.findUnique({
 *     where: { identifier_token: { identifier: phoneHash, token: code } }
 *   });
 *   
 *   if (!token) throw new Error('Token not found');
 *   
 *   // Firebase Auth で SMS 送信
 *   await admin.auth().getAuth().sendSignInLinkToEmail(token.identifier, {
 *     url: `${process.env.NEXTAUTH_URL}/auth/callback`,
 *     handleCodeInApp: true
 *   });
 * }
 * ```
 * 
 * @example Twilio
 * ```typescript
 * import twilio from 'twilio';
 * 
 * async function sendVerificationCodeProduction(phoneHash: string, code: string) {
 *   const client = twilio(
 *     process.env.TWILIO_ACCOUNT_SID,
 *     process.env.TWILIO_AUTH_TOKEN
 *   );
 *   
 *   // VerificationToken から生の電話番号を復元
 *   const token = await prisma.verificationToken.findUnique({
 *     where: { identifier_token: { identifier: phoneHash, token: code } }
 *   });
 *   
 *   if (!token) throw new Error('Token not found');
 *   
 *   await client.messages.create({
 *     body: `OSHI-HIGH: Your verification code is ${code}. Valid for 5 minutes.`,
 *     from: process.env.TWILIO_PHONE_NUMBER,
 *     to: token.identifier // This should be the phone number
 *   });
 * }
 * ```
 *
 * @example AWS SNS
 * ```typescript
 * import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
 * 
 * async function sendVerificationCodeProduction(phoneHash: string, code: string) {
 *   const client = new SNSClient({ region: process.env.AWS_REGION });
 *   
 *   const token = await prisma.verificationToken.findUnique({
 *     where: { identifier_token: { identifier: phoneHash, token: code } }
 *   });
 *   
 *   if (!token) throw new Error('Token not found');
 *   
 *   await client.send(new PublishCommand({
 *     Message: `OSHI-HIGH: Your verification code is ${code}. Valid for 5 minutes.`,
 *     PhoneNumber: token.identifier
 *   }));
 * }
 * ```
 *
 * NOTE: This function receives phoneHash, not the raw phone number.
 * Recovery strategies:
 * 1. Lookup raw phone in VerificationToken via phoneHash (recommended)
 * 2. Store mapping in Redis or cache temporarily
 * 3. Modify API to pass both hash and plaintext (less secure)
 */
