import type { Metadata, Viewport } from "next";
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
  title: "Khara Kai Mumbai - Real-Time Truth Guardian",
  description: "Mumbai's Reality Check—When Truth Matters Most. AI-powered fact-checking for Mumbai's viral news, rumors, and crisis misinformation. Verify claims in English, Hindi & Marathi.",
  keywords: ["fact-check", "Mumbai", "news verification", "fake news", "WhatsApp forwards", "AI verification", "Khara Kai", "misinformation", "flood news", "Mumbai Police", "BMC alerts"],
  authors: [{ name: "Khara Kai Mumbai Team" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Khara Kai Mumbai - Real-Time Truth Guardian",
    description: "Mumbai's Reality Check—When Truth Matters Most. Combat misinformation during floods, accidents & crises.",
    type: "website",
    locale: "en_IN",
    siteName: "Khara Kai Mumbai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Khara Kai Mumbai - Real-Time Truth Guardian",
    description: "Mumbai's Reality Check—When Truth Matters Most. AI-powered fact-checking for crisis misinformation.",
    creator: "@KharaKaiMumbai",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50`}
      >
        {children}
      </body>
    </html>
  );
}
