import type { Metadata } from "next";
import { Cormorant_Garamond, Libre_Baskerville, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-cormorant-garamond",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-libre-baskerville",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Precentor — Church Music Planner",
  description: "AI-powered liturgical music and service planning for Church of England parishes",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://precentor.app"),
  openGraph: {
    title: "Precentor — Church Music Planner",
    description: "AI-powered liturgical music and service planning for Church of England parishes",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${cormorantGaramond.variable} ${libreBaskerville.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
