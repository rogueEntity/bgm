// web/src/middleware.ts
import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!session;
  const isLoginPage = pathname === "/login";
  const isOnboardingPage = pathname === "/onboarding";

  // @ts-ignore
  const hasProfile = !!session?.user?.nickname;

  // 1. 미로그인 사용자는 /login, 정적/API 제외 모든 페이지 접근 차단
  if (!isLoggedIn) {
    if (isLoginPage) return NextResponse.next();

    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2. 로그인 사용자는 /login 접근 차단
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3. 로그인했지만 온보딩 미완료면 /onboarding으로 보냄
  if (!hasProfile && !isOnboardingPage) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // 4. 온보딩 완료 유저는 /onboarding 접근 차단
  if (hasProfile && isOnboardingPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};