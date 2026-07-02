// web/src/app/(main)/layout.tsx
import { auth, signOut } from "@/auth";
import Link from "next/link";
import React from "react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/current-user";
import UserAvatar from "@/components/common/UserAvatar";
import { getAvatarImageUrl } from "@/lib/avatar";
import {getEnabledGameModules} from "@/features/games/shared/enabled-games";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentDbUser();

  if (!currentUser?.nickname || !currentUser?.avatar_emoji) {
    redirect("/onboarding");
  }

  const enabledGameModules = getEnabledGameModules();
  const nickname = currentUser.nickname;
  const avatarEmoji = currentUser.avatar_emoji;
  const avatarImageUrl = getAvatarImageUrl(
    currentUser.avatar_image_key,
    currentUser.avatar_image_updated_at,
  );

  const isAdmin = await isCurrentUserAdmin();

  const menuLinkClassName = "shrink-0 px-3 py-1.5 md:px-4 md:py-3 rounded-xl font-bold transition hover:bg-foreground/5 text-sm md:text-base active:scale-95 active:bg-foreground/10 active:text-foreground";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      {/* 네비게이션 영역 */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-foreground/10 flex flex-col justify-between bg-background z-10 sticky top-0 md:h-screen px-4 pt-3 pb-1 md:p-6 shadow-sm md:shadow-none">
        <div className="flex md:flex-col items-center md:items-start justify-between mb-2 md:mb-10">
          <div className="px-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
              BGM
            </h1>
            <p className="hidden md:block text-[10px] text-foreground/60 font-semibold tracking-widest uppercase mt-1">
              Boardgame Manager
            </p>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/me"
              className="flex items-center gap-1.5 bg-foreground/5 px-2 py-1.5 rounded-lg border border-foreground/10 transition hover:bg-foreground/10"
            >
              <UserAvatar
                imageUrl={avatarImageUrl}
                emoji={avatarEmoji}
                name={nickname}
                size="sm"
                className="h-[18px] w-[18px] text-sm"
              />
              <span className="text-xs font-bold leading-none">{nickname}</span>
            </Link>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="text-xs font-bold text-red-500/80 px-3 py-1.5 rounded-lg bg-red-500/10">
                로그아웃
              </button>
            </form>
          </div>
        </div>

        <nav className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden md:flex-col md:gap-2 md:overflow-visible">
          <Link href="/" className={menuLinkClassName}>
            🏠 홈
          </Link>
          {enabledGameModules.map((gameModule) => (
              <Link key={gameModule.key} href={gameModule.routes.dashboard} className={menuLinkClassName}>
                <span className="mr-2">{gameModule.icon}</span>
                {gameModule.name}
              </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/notices" className={menuLinkClassName}>
              ⚙️ 공지 관리
            </Link>
          )}
        </nav>

        <div className="hidden md:block mt-auto pt-8">
          <Link
            href="/me"
            className="flex items-center gap-3 px-4 py-3 mb-3 rounded-xl bg-foreground/5 border border-foreground/10 transition hover:bg-foreground/10"
          >
            <UserAvatar
              imageUrl={avatarImageUrl}
              emoji={avatarEmoji}
              name={nickname}
              size="sm"
              className="h-8 w-8 text-2xl"
            />
            <div className="font-bold">{nickname}</div>
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="w-full text-center px-4 py-3 rounded-xl font-bold text-red-500/80 transition hover:bg-red-500/10 hover:text-red-500">
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* 오른쪽 메인 콘텐츠 영역 (page.tsx가 여기에 렌더링 됨) */}
      <main className="flex-1 p-6 md:p-10 flex flex-col">{children}</main>
    </div>
  );
}