import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Using Outfit for a more premium feel
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Varsayım - Süper Lig Hakem Analizi",
    template: "%s | Varsayım"
  },
  description: "Türkiye Süper Lig hakem kararlarının analizi, VAR pozisyonları, uzman yorumları ve PFDK kararları.",
  keywords: ["hakem", "süper lig", "VAR", "hakem analizi", "futbol", "Türkiye"],
  authors: [{ name: "Varsayım" }],
  openGraph: {
    title: "Varsayım - Süper Lig Hakem Performans Analizi",
    description: "Türkiye Süper Lig hakem kararlarının analizi, VAR pozisyonları, uzman yorumları ve PFDK kararları.",
    type: "website",
  },
};

import Navbar from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-black text-white overflow-x-hidden w-full font-sans`}
      >
        <Navbar />
        {children}
        <Footer />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
