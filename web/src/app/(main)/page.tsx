// web/src/app/(main)/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  // 로그인 상태인데 닉네임이 비어있다면 온보딩 페이지로 강제 이동
  // @ts-ignore
  if (session && !session.user?.nickname) {
    redirect("/onboarding");
  }

  // @ts-ignore
  const nickname = session?.user?.nickname;
  // @ts-ignore
  const avatarEmoji = session?.user?.avatarEmoji;

  return (
    <>
      <header className="mb-6 md:mb-8 hidden md:block">
        <h2 className="text-3xl font-black">홈</h2>
      </header>

      <div className="p-8 bg-foreground/5 border border-foreground/10 rounded-2xl flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-5xl md:text-6xl mb-6">{avatarEmoji}</div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">
          환영합니다, {nickname}님!
        </h3>
        <p className="text-sm md:text-base text-foreground/60">
          추후 이곳에 랭킹이나 새 소식 등이 노출될 예정입니다.
        </p>
      </div>
    </>
  );
}