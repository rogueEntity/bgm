// web/src/components/common/Modal.tsx

"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
    open: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
    footer?: ReactNode;
};

export default function Modal({
                                  open,
                                  title,
                                  children,
                                  onClose,
                                  footer,
                              }: Readonly<ModalProps>) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-border px-6 py-4">
                    <h2 className="text-lg font-bold">{title}</h2>
                </div>

                <div className="px-6 py-5">
                    {children}
                </div>

                <div className="border-t border-border px-6 py-4">
                    {footer ?? (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background transition hover:opacity-90"
                            >
                                확인
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}