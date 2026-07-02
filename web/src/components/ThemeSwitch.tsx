// web/src/components/ThemeSwitch.tsx

"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

type ThemeSwitchProps = {
    className?: string;
};

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyTheme(mode: ThemeMode) {
    const resolvedTheme = mode === "system" ? getSystemTheme() : mode;
    const isDark = resolvedTheme === "dark";

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";

    if (mode === "system") {
        localStorage.removeItem("theme");
        return;
    }

    localStorage.setItem("theme", mode);
}

export default function ThemeSwitch({ className = "" }: ThemeSwitchProps) {
    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<ThemeMode>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const storedTheme = localStorage.getItem("theme");
        const initialMode: ThemeMode =
            storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";

        setMode(initialMode);
        setResolvedTheme(initialMode === "system" ? getSystemTheme() : initialMode);
        setMounted(true);

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleSystemThemeChange = () => {
            const currentStoredTheme = localStorage.getItem("theme");

            if (!currentStoredTheme) {
                const nextSystemTheme = getSystemTheme();

                setMode("system");
                setResolvedTheme(nextSystemTheme);
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleSystemThemeChange);
        };
    }, []);

    const isDark = resolvedTheme === "dark";
    const isSystem = mode === "system";

    const handleToggle = () => {
        const nextMode: ThemeMode = isDark ? "light" : "dark";

        setMode(nextMode);
        setResolvedTheme(nextMode);
        applyTheme(nextMode);
    };

    const handleSystem = () => {
        const nextResolvedTheme = getSystemTheme();

        setMode("system");
        setResolvedTheme(nextResolvedTheme);
        applyTheme("system");
    };

    if (!mounted) {
        return (
            <div
                className={`h-8 w-[92px] rounded-full border border-foreground/10 bg-foreground/5 ${className}`}
                aria-hidden="true"
            />
        );
    }

    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <button
                type="button"
                onClick={handleToggle}
                aria-label={isDark ? "라이트 모드로 변경" : "다크 모드로 변경"}
                className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-foreground/10 bg-foreground/10 px-1 transition hover:bg-foreground/15"
            >
        <span
            className={`absolute left-1.5 text-[10px] transition ${
                isDark ? "opacity-35" : "opacity-100"
            }`}
        >
          ☀️
        </span>

                <span
                    className={`absolute right-1.5 text-[10px] transition ${
                        isDark ? "opacity-100" : "opacity-35"
                    }`}
                >
          🌙
        </span>

                <span
                    className={`relative h-6 w-6 rounded-full bg-background shadow-sm transition ${
                        isDark ? "translate-x-6" : "translate-x-0"
                    }`}
                />
            </button>

            <button
                type="button"
                onClick={handleSystem}
                aria-pressed={isSystem}
                className={`h-8 rounded-full border px-2.5 text-[11px] font-bold transition ${
                    isSystem
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-foreground/10 bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
                }`}
            >
                자동
            </button>
        </div>
    );
}