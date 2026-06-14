// web/src/middleware.ts
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

// 가벼운 설정만 넣어서 미들웨어용 auth 객체를 생성
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  // 1. 로그인 안 된 사용자는 /login으로 강제 이동
  if (!session && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. 로그인된 사용자가 /login에 접근하면 메인으로 이동
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

// 이 경로들은 미들웨어가 무시함 (onboarding 제외 필수)
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|onboarding).*)"],
};