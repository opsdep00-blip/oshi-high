import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

import { randomBytes } from "crypto";
import logger from "@/lib/logger";
import { verifySmsCode } from "@/lib/smsAuth";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { User, Account } from "next-auth";

// Typed token that includes phoneVerified flag
type JwtWithPhone = JWT & { phoneVerified?: boolean };

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ⚠️ 重要: 正式なログイン認証は OAuth 2.0 (Google / Twitter) で実装予定
  // SMS認証は /api/debug/sms/ の一時的なデバッグエンドポイントに移動
  // SMS認証の本来の用途: 推し本人による「Claim」機能の検証（ログインではない）
  
  adapter: PrismaAdapter(prisma),
  
  providers: (() => {
    // Base providers (real OAuth)
    const providers = [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      }),

      TwitterProvider({
        clientId: process.env.TWITTER_CLIENT_ID || "",
        clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[];

    // Development helper: enable mock OAuth flows for local development
    if (process.env.ENABLE_OAUTH_MOCK === "true") {
      providers.push(
        CredentialsProvider({
          id: "mock",
          name: "Mock OAuth",
          credentials: {
            provider: { label: "provider", type: "text" },
            name: { label: "name", type: "text" },
            email: { label: "email", type: "email" },
          },
          async authorize(credentials: Partial<Record<"email" | "provider" | "name", unknown>> | undefined) {
            const provider = String((credentials?.provider as string) ?? "google");
            const displayName = String((credentials?.name as string) ?? `${provider}-dev`);
            const email = String((credentials?.email as string) ?? `${provider}@example.test`);

            // Try to find a user by existing provider account
            const account = await prisma.account.findFirst({ where: { provider, providerAccountId: `${email}` } });
            let user: import("@prisma/client").User | null = null;
            if (account) {
              user = await prisma.user.findUnique({ where: { id: account.userId } });
            }

            if (!user) {
              user = await prisma.user.create({
                data: {
                  name: displayName,
                  email,
                  role: "FAN",
                  accounts: { create: { type: "oauth", provider, providerAccountId: `${email}` } },
                },
              });
            } else {
              // ensure account exists
              const hasAcc = await prisma.account.findFirst({ where: { userId: user.id, provider } });
              if (!hasAcc) {
                await prisma.account.create({ data: { userId: user.id, type: "oauth", provider, providerAccountId: `${email}` } });
              }
            }

            return { id: String(user.id), name: user.name, email: user.email };
          },
        })
      );
    }

    // CredentialsProvider: SMS (supports idToken or phone+code)
    providers.push(
      CredentialsProvider({
        id: "sms",
        name: "SMS",
        credentials: {
          phone: { label: "Phone", type: "text" },
          code: { label: "Code", type: "text" },
          sessionInfo: { label: "SessionInfo", type: "text" },
          idToken: { label: "ID Token", type: "text" },
        },
        async authorize(credentials: Record<string, unknown> | undefined) {
          if (!credentials) return null;

          // 1) ID Token path (client obtains ID token from Firebase and sends it here)
          const idToken = String(credentials.idToken || "").trim();
          if (idToken) {
            try {
              const { user } = await verifySmsCode({ idToken }, "", "signin");
              return { id: String(user.id), name: user.name ?? null, email: user.email ?? null };
            } catch (e) {
              logger.warn("Credentials (sms) idToken verification failed", { error: e });
              return null;
            }
          }

          // 2) phone + code path (server-side verification)
          const phone = String(credentials.phone || "").trim();
          const code = String(credentials.code || "").trim();
          const sessionInfo = String(credentials.sessionInfo || "").trim() || undefined;

          if (phone && code) {
            try {
              const { user } = await verifySmsCode({ phone, sessionInfo }, code, "signin");
              return { id: String(user.id), name: user.name ?? null, email: user.email ?? null };
            } catch (e) {
              logger.warn("Credentials (sms) phone/code verification failed", { error: e });
              return null;
            }
          }

          return null;
        },
      })
    );

    return providers;
  })(),

  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      // Handle Twitter claim as before
      if (account?.provider === "twitter") {
        const twitterId = account.providerAccountId;

        const idol = await prisma.idol.findUnique({ where: { snsLink: twitterId } });

        if (idol && !idol.claimedBy) {
          await prisma.idol.update({ where: { id: idol.id }, data: { claimedBy: user.id, claimedAt: new Date(), snsVerifiedAt: new Date() } });
          await prisma.user.update({ where: { id: user.id }, data: { role: "IDOL" } });
          logger.info(`[Auth] Idol ${idol.name} (${idol.id}) claimed by user ${user.id}`);
        }
      }

      // New: Prevent automatic linking when provider account is new but email exists
      if (account) {
        // Check if account already exists (provider+providerAccountId)
        const existingAccount = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } } });
        if (existingAccount) {
          return true; // normal flow
        }

        // if no account exists, check if a user with same email exists
        if (user?.email) {
          const existingUserByEmail = await prisma.user.findUnique({ where: { email: user.email } });
          if (existingUserByEmail) {
            // Create PendingLink and remove any temporary account created by adapter
            const token = randomBytes(16).toString("hex");
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await prisma.pendingLink.create({ data: { token, provider: account.provider, providerAccountId: account.providerAccountId, data: JSON.parse(JSON.stringify(account)), expiresAt } });

            // delete any account that might have been created for this provider/accountId
            await prisma.account.deleteMany({ where: { provider: account.provider, providerAccountId: account.providerAccountId } });

            // Redirect to resolve page where user can choose to link
            return `/auth/resolve?token=${token}`;
          }
        }
      }

      return true;
    },

    async jwt({ token, user }: { token: JWT; user?: User }) {
      type JwtWithPhone = JWT & { phoneVerified?: boolean };
      const t = token as JwtWithPhone;
      if (user) {
        t.sub = user.id;
        // include phoneVerified in token on sign in
        t.phoneVerified = ((user as unknown as { phoneVerified?: boolean })?.phoneVerified) ?? false;
      } else if (t.sub) {
        // refresh phoneVerified from DB on subsequent requests
        try {
          const dbUser = await prisma.user.findUnique({ where: { id: t.sub } });
          t.phoneVerified = dbUser?.phoneVerified ?? false;
        } catch {
          t.phoneVerified = t.phoneVerified ?? false;
        }
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      type SessionUserWithPhone = Session['user'] & { id?: string; phoneVerified?: boolean };
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // expose phoneVerified in session
        const u = session.user as SessionUserWithPhone;
        const t = token as JwtWithPhone;
        u.phoneVerified = t.phoneVerified ?? false;
      }
      return session;
    },

    // After sign in, redirect users to My Account page by default
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // If provider requested a specific callback, respect it
      if (url && url !== baseUrl && url.startsWith(baseUrl)) return url;
      return '/account';
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
