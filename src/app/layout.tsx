import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // Using Inter as standard sans
import "./globals.css";

const sansFont = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
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
        className={`${sansFont.variable} ${monoFont.variable} antialiased bg-background text-foreground`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
