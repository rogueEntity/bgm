// web/src/app/layout.tsx

import type { Metadata } from "next";
import { connection } from "next/server";
import { getServiceName } from "@/lib/site";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import ThemeScript from "@/components/ThemeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bgm.rogntt.net";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const serviceName = getServiceName();
  const thumbnailUrl = process.env.SITE_THUMBNAIL_URL?.trim() || "/og-image.png";

  return {
    metadataBase: new URL(siteUrl),
    title: `${serviceName} | 보드게임 전적 관리`,
    description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
    openGraph: {
      title: `${serviceName} | 보드게임 전적 관리`,
      description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
      url: siteUrl,
      siteName: serviceName,
      images: [
        {
          url: thumbnailUrl,
          width: 1200,
          height: 630,
          alt: `${serviceName} 보드게임 전적 관리`,
        },
      ],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${serviceName} | 보드게임 전적 관리`,
      description: "보드게임 스코어 트래킹 및 전적 관리 서비스",
      images: [thumbnailUrl],
    },
  };
}

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="ko" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
      {children}
      </body>
      </html>
  );
}
