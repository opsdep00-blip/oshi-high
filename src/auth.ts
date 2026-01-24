import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPhoneNumber, verifyPhoneNumber } from "@/lib/phoneHash";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { User, Account } from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ⚠️ 重要: CredentialsProvider を使用する場合、adapter は使用できません
  // PrismaAdapter は OAuth プロバイダー（Twitter など）でのみ使用可能
  // CredentialsProvider は JWT セッション戦略と組み合わせて使用します
  providers: [
    // SMS 認証 (ファン向け)
    CredentialsProvider({
      id: "sms",
      name: "SMS Authentication",
      credentials: {
        phone: { label: "Phone Number", type: "tel", placeholder: "09012345678" },
        code: { label: "Verification Code", type: "text", placeholder: "123456" },
      },
      async authorize(credentials: any) {
        console.log("=== [Auth] Received credentials ===", credentials);

        if (!credentials?.phone || !credentials?.code) {
          throw new Error("Phone number and verification code are required");
        }

        // ステップ 1: 電話番号をハッシュ化
        // 注: VerificationToken 検証用には salt なしの単純なハッシュを使用
        const phoneHash = crypto.createHash("sha256").update(credentials.phone).digest("hex");
        console.log("=== [Auth] phoneHash ===", phoneHash);
        console.log("=== [Auth] code ===", credentials.code);

        // ステップ 2: VerificationToken テーブルを検索
        // identifier が phoneHash かつ token が code で、有効期限内のものを探す
        const verificationToken = await prisma.verificationToken.findUnique({
          where: {
            identifier_token: {
              identifier: phoneHash,
              token: credentials.code,
            },
          },
        });

        console.log("=== [Auth] Found token ===", verificationToken);

        if (!verificationToken) {
          throw new Error("TOKEN_NOT_FOUND");
        }

        // ステップ 3: 有効期限をチェック
        if (verificationToken.expires < new Date()) {
          console.log("=== [Auth] Token expired ===", verificationToken.expires);
          // 期限切れのコードを削除
          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: phoneHash,
                token: credentials.code,
              },
            },
          });
          throw new Error("TOKEN_EXPIRED");
        }

        // ステップ 4: User テーブルからユーザーを取得（いなければ新規作成）
        let user = await prisma.user.findUnique({
          where: { phoneHash },
        });

        if (!user) {
          // 新規ユーザー作成
          // 注: User テーブルには salt なしハッシュを保存（一貫性のため）
          user = await prisma.user.create({
            data: {
              phoneHash,
              phoneSalt: null, // salt は使用しない
              role: "FAN",
              accounts: {
                create: {
                  type: "credentials",
                  provider: "sms",
                  providerAccountId: phoneHash,
                },
              },
            },
          });
          console.log(`[Auth] New user created: ${user.id}`);
        } else {
          console.log(`[Auth] Existing user authenticated: ${user.id}`);
        }

        // ステップ 5: ログイン成功後は VerificationToken を削除
        try {
          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: phoneHash,
                token: credentials.code,
              },
            },
          });
          console.log(`[Auth] Verification token deleted for user ${user.id}`);
        } catch (deleteError) {
          console.error("[Auth] Error deleting verification token:", deleteError);
          // エラーが発生してもログイン処理は続ける
        }

        return {
          id: user.id,
          email: user.email || undefined,
          name: user.name || undefined,
          image: user.image || undefined,
        };
      },
    }),

    // SNS 認証 (推し本人向け)
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
    }),
  ],

  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      // SMS 認証の場合: 重複ログイン防止
      if (account?.provider === "sms") {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { accounts: true },
        });

        // 複数の SMS Account を持つことを防止
        const smsAccounts = existingUser?.accounts.filter(
          (a: any) => a.provider === "sms"
        );
        if (smsAccounts && smsAccounts.length > 1) {
          console.error(
            `[Auth] Duplicate SMS registration attempt for user ${user.id}`
          );
          return false;
        }
      }

      // Twitter 認証の場合: Idol Claim ロジック
      if (account?.provider === "twitter") {
        const twitterId = account.providerAccountId;

        // snsLink が一致する Idol を探す
        const idol = await prisma.idol.findUnique({
          where: { snsLink: twitterId },
        });

        if (idol && !idol.claimedBy) {
          // Official Claim: User を Idol にリンク
          await prisma.idol.update({
            where: { id: idol.id },
            data: {
              claimedBy: user.id,
              claimedAt: new Date(),
              snsVerifiedAt: new Date(),
            },
          });

          // User の role を IDOL に昇格
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "IDOL" },
          });

          console.log(
            `[Auth] Idol ${idol.name} (${idol.id}) claimed by user ${user.id}`
          );
        }
      }

      return true;
    },

    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
