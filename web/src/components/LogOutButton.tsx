// web/src/components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react"; // next-auth의 클라이언트용 signOut 사용

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm font-medium text-foreground/50 hover:text-foreground transition underline underline-offset-4"
    >
      로그아웃
    </button>
  );
}