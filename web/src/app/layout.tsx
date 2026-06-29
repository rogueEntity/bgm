// web/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://bgm.rogntt.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BGM | 보드게임 전적 관리",
  description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
  openGraph: {
    title: "BGM | 보드게임 전적 관리",
    description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
    url: siteUrl,
    siteName: "BGM",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BGM 보드게임 전적 관리",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BGM | 보드게임 전적 관리",
    description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
          lang="ko"
          className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
      <body className="min-h-full flex flex-col">{children}</body>
      </html>
  );
}