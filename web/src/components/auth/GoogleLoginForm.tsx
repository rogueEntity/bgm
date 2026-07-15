// web/src/components/auth/GoogleLoginForm.tsx

"use client";

import { ReactNode, useState } from "react";

import Modal from "@/components/common/Modal";

type Props = {
    action: () => void | Promise<void>;
    children: ReactNode;
};

function isInAppBrowser() {
    if (typeof window === "undefined") {
        return false;
    }

    const ua = window.navigator.userAgent.toLowerCase();

    return (
        ua.includes("kakaotalk") ||
        ua.includes("instagram") ||
        ua.includes("fban") ||
        ua.includes("fbav") ||
        ua.includes("line") ||
        ua.includes("naver") ||
        ua.includes("daumapps")
    );
}

export default function GoogleLoginForm({
                                            action,
                                            children,
                                        }: Readonly<Props>) {
    const [open, setOpen] = useState(false);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        if (!isInAppBrowser()) {
            return;
        }

        event.preventDefault();
        setOpen(true);
    }

    return (
        <>
            <form action={action} onSubmit={handleSubmit}>
                {children}
            </form>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="외부 브라우저에서 열어주세요"
            >
                <div className="space-y-4 text-sm leading-6 text-foreground/70">
                    <p>
                        카카오톡 등의 인앱 브라우저에서는 Google 보안 정책으로 인해
                        Google 로그인을 사용할 수 없습니다.
                    </p>

                    <div>
                        <div className="font-semibold text-foreground">
                            iPhone
                        </div>

                        <p>
                            오른쪽 위(또는 아래) 메뉴 →
                            <strong> Safari에서 열기</strong>
                        </p>
                    </div>

                    <div>
                        <div className="font-semibold text-foreground">
                            Android
                        </div>

                        <p>
                            오른쪽 위 메뉴 →
                            <strong> Chrome에서 열기</strong>
                        </p>
                    </div>

                    <p>
                        외부 브라우저에서 다시 접속하면 정상적으로 로그인할 수 있습니다.
                    </p>
                </div>
            </Modal>
        </>
    );
}