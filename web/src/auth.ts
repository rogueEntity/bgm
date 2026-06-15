// web/src/auth.ts
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { db } from "@/lib/prisma";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // 미들웨어용 가벼운 설정(pages, providers 등)을 병합
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks, // auth.config.ts에 분리해둔 session 콜백을 병합

    // 무거운 작업(DB 조회)이 포함된 jwt 콜백은 Node 환경인 여기서만 실행됩니다.
    async jwt({ token, account }) {
      if (account) {
        token.providerId = account.providerAccountId;
        token.provider = account.provider;
      }

      if (token.providerId) {
        // DB에 유저가 있는지 확인
        const dbUser = await db.users.findFirst({
          where: { provider_id: token.providerId as string },
        });

        // DB에 유저가 있다면 (온보딩을 완료했다면) 닉네임과 이모지를 토큰에 저장
        if (dbUser) {
          token.nickname = dbUser.nickname;
          token.avatarEmoji = dbUser.avatar_emoji;
        }
      }
      return token;
    },
  },
});