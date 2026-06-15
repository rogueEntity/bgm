// web/src/app/login/page.tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="text-center mb-10">
        <h1 className="text-6xl font-black tracking-tighter text-foreground">
          BGM
        </h1>
        <p className="text-sm text-foreground/60 font-semibold tracking-widest uppercase mt-1">
          Boardgame Manager
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* 구글 로그인 */}
        <form action={async () => { "use server"; await signIn("google"); }}>
          <button className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-700 transition">
            <span>G</span>
            구글 로그인
          </button>
        </form>

        {/* 카카오 로그인 */}
        <form action={async () => { "use server"; await signIn("kakao"); }}>
          <button className="w-full flex items-center justify-center gap-3 bg-yellow-400 text-black py-3 px-4 rounded-lg font-bold hover:bg-yellow-500 transition">
            <span>K</span>
            카카오 로그인
          </button>
        </form>
      </div>
    </main>
  );
}