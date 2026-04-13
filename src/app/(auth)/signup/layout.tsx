import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — Precentor",
  description: "Create a free Precentor account to start planning church services and music.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
