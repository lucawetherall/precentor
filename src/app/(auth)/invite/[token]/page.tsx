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
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setPageError(data.error || "Invalid or expired invite.");
        return;
      }
      const data = await res.json();
      setInvite(data);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
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
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-3xl font-heading font-semibold">Invalid Invite</h1>
          <p className="text-sm text-muted-foreground">{pageError}</p>
          <a href="/login" className="text-sm text-primary hover:underline">Go to sign in</a>
        </div>
      </main>
    );
  }

  if (!invite || isAuthenticated === null) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-semibold">You&apos;re Invited</h1>
          <p className="text-sm text-muted-foreground">
            Join <strong>{invite.churchName}</strong> as <strong>{invite.role}</strong>
          </p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={handleAcceptOnly}
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
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
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-body">Email</label>
              <input
                type="email"
                value={invite.email}
                disabled
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
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account & Join"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
