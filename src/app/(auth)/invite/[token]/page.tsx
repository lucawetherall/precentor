"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";

interface InviteData {
  churchName: string;
  role: string;
  email: string;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    async function loadInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (!res.ok) {
          let message = "Invalid or expired invite.";
          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            const data = await res.json();
            message = data.error || message;
          }
          setPageError(message);
          return;
        }
        const data = await res.json();
        setInvite(data);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch {
        setPageError("Invalid or expired invite.");
      }
    }
    loadInvite();
  }, [token]);

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Create account
    const { error: signUpError } = await supabase.auth.signUp({
      email: invite!.email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      // If user already exists, try signing in instead
      if (signUpError.message.includes("already registered")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invite!.email,
          password,
        });
        if (signInError) {
          setError("This email is already registered. Please sign in first, then revisit this invite link.");
          setLoading(false);
          return;
        }
      } else {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    }

    // Accept the invite
    await acceptInvite();
  };

  const handleAcceptOnly = async () => {
    setLoading(true);
    setError("");
    await acceptInvite();
  };

  const acceptInvite = async () => {
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/churches/${data.churchId}/sundays`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to accept invite.");
      setLoading(false);
    }
  };

  if (pageError) {
    return (
      <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-3xl font-heading font-semibold">Invalid Invite</h1>
          <p role="alert" className="text-sm text-muted-foreground">{pageError}</p>
          <a href="/login" className="text-sm text-primary underline hover:no-underline">Go to sign in</a>
        </div>
      </main>
    );
  }

  if (!invite || isAuthenticated === null) {
    return (
      <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="sr-only">Loading Invite</h1>
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-semibold">You&apos;re Invited</h1>
          <p className="text-sm text-muted-foreground">
            Join <strong>{invite.churchName}</strong> as <strong>{invite.role}</strong>
          </p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button
              onClick={handleAcceptOnly}
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Accepting..." : "Accept Invite"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignupAndAccept} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-body">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                autoComplete="name"
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-body">Email</label>
              <input
                id="invite-email"
                type="email"
                value={invite.email}
                disabled
                autoComplete="email"
                className="w-full px-3 py-2 text-sm border border-border bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-body">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-body">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account & Join"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
