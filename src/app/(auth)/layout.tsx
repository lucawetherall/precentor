import Link from "next/link";

/**
 * Shared chrome for the auth pages (login, signup, forgot/reset password,
 * invite). Adds a brand wordmark linking back to the homepage so visitors
 * who land here directly have an anchor — the pages themselves stay
 * vertically centred.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <header className="absolute top-0 inset-x-0 z-10 flex justify-center pt-8">
        <Link
          href="/"
          className="font-heading text-2xl font-semibold tracking-wide text-foreground hover:text-primary transition-colors"
        >
          Precentor
        </Link>
      </header>
      {children}
    </div>
  );
}
