import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RefereeLig - Süper Lig Hakem Performans Analizi",
  description: "Türkiye Süper Lig hakem kararlarının analizi, VAR pozisyonları, uzman yorumları ve PFDK kararları.",
  keywords: ["hakem", "süper lig", "VAR", "hakem analizi", "futbol", "Türkiye"],
  authors: [{ name: "RefereeLig" }],
  openGraph: {
    title: "RefereeLig - Süper Lig Hakem Performans Analizi",
    description: "Türkiye Süper Lig hakem kararlarının analizi, VAR pozisyonları, uzman yorumları ve PFDK kararları.",
    type: "website",
  },
};

import Navbar from "@/components/layout/Navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
