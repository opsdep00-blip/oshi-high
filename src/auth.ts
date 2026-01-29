import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import TwitterProvider from "next-auth/providers/twitter";
// import CredentialsProvider from "next-auth/providers/credentials"; // [DEPRECATED] SMS login via CredentialsProvider
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { User, Account } from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ⚠️ 重要: 正式なログイン認証は OAuth 2.0 (Google / Twitter) で実装予定
  // SMS認証は /api/debug/sms/ の一時的なデバッグエンドポイントに移動
  // SMS認証の本来の用途: 推し本人による「Claim」機能の検証（ログインではない）
  
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // 正式ログイン: Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),

    // 推し本人認証: Twitter OAuth (Idol Claim用)
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
    }),

    // [DEPRECATED] SMS 認証は /api/debug/sms/ に移動
    // ログイン用ではなく、機能追加（支援フロー検証など）として使用予定
    /*
    CredentialsProvider({
      id: "sms",
      name: "SMS Authentication",
      credentials: {
        phone: { label: "Phone Number", type: "tel", placeholder: "09012345678" },
        code: { label: "Verification Code", type: "text", placeholder: "123456" },
      },
      async authorize(credentials: any) {
        // ... SMS logic moved to /api/debug/sms/
      },
    }),
    */
  ],

  callbacks: {
    async signIn({ user, account }: { user: User; account?: Account | null }) {
      // Twitter 認証の場合: Idol Claim ロジック
      // 推し本人が Twitter で認証したとき、自分の推しアカウントを「Claim」できる
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
