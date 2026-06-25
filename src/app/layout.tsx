import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PWAClientRegister from "@/components/PWAClientRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  fallback: ["Poppins", "Open Sans", "sans-serif"],
});

export const metadata: Metadata = {
  title: "FitAI - Premium Fitness SaaS",
  description: "AI-powered hyper-personalized nutrition and workout coach.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FitAI",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/10">
        <PWAClientRegister />
        {children}
      </body>
    </html>
  );
}
