import type { Metadata } from "next";
import { Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { ExtracurricularProvider } from "@/components/ExtracurricularProvider";
import { readEnabledExtracurriculars } from "@/lib/extracurricular-settings";
import type { EskulKey } from "@/lib/types";
import { PushNotifications } from "@/components/PushNotifications";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Jadwal Ekstrakurikuler 2026/2027",
  description:
    "Jadwal dan informasi ekstrakurikuler SMP SMK IDN Akhwat.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let enabled: EskulKey[] = [];
  let available = true;
  try { enabled = await readEnabledExtracurriculars(); } catch { available = false; }
  return (
    <html
      lang="id"
      className={`${inter.variable} ${hankenGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- app-router root layout is the documented place for a global icon font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface"><ExtracurricularProvider initial={enabled} available={available}>{children}<PushNotifications/></ExtracurricularProvider></body>
    </html>
  );
}
