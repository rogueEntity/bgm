// web/src/middleware.ts

import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!session;

  /**
   * 온보딩 페이지는 로그인한 사용자가 접근해야 하는 페이지다.
   * 여기서 /onboarding을 로그인 유저 접근 차단 대상으로 넣으면
   * / → /onboarding → / → /onboarding 무한 리다이렉트가 발생할 수 있다.
   */
  const isPublicPath =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/onboarding/");

  // 로그인 안 된 사용자는 공개 페이지를 제외하고 /login으로 이동
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 로그인된 사용자가 /login에 접근하면 메인으로 이동
  // 단, /onboarding은 막지 않는다.
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /**
     * 인증이 필요한 페이지에만 middleware 적용.
     *
     * 제외:
     * - api
     * - _next/static
     * - _next/image
     * - favicon / icon / apple-touch-icon
     * - public 정적 파일(svg, png, jpg, ico, css 등)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|favicon-32x32.png|apple-touch-icon.png|.*\\..*).*)",
  ],
};