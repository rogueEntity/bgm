// web/src/auth.config.ts
import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [], // 실제 provider는 auth.ts에서 합쳐짐
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // 미들웨어(Edge 환경)에서도 토큰 값을 읽을 수 있도록 가벼운 맵핑만 수행
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.providerId as string;
        // @ts-ignore
        session.user.nickname = token.nickname;
        // @ts-ignore
        session.user.avatarEmoji = token.avatarEmoji;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;