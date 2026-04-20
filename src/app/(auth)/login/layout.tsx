import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Precentor",
  description: "Sign in to your Precentor account to manage church services and music.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
