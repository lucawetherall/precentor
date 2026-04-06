"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteData {
  churchName: string;
  role: string;
  email: string | null;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);

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

  const effectiveEmail = invite?.email || signupEmail;

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!effectiveEmail) {
      setError("Please enter your email address.");
      return;
    }
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

    // Create account with redirect back to this invite page after confirmation
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: effectiveEmail,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}`,
      },
    });

    if (signUpError) {
      // If user already exists, try signing in instead
      if (signUpError.message.includes("already registered")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: effectiveEmail,
          password,
        });
        if (signInError) {
          setError("This email is already registered. Please sign in first, then revisit this invite link.");
          setLoading(false);
          return;
        }
        // Sign-in succeeded — session exists, accept invite directly
        await acceptInvite();
        return;
      } else {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    }

    // If email confirmation is required, signUp succeeds but returns no session
    if (signUpData?.user && !signUpData.session) {
      setConfirmationPending(true);
      setLoading(false);
      return;
    }

    // Session exists (email confirmation disabled, or sign-in fallback) — accept now
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
      router.push(`/churches/${data.churchId}/services`);
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

  if (confirmationPending) {
    return (
      <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-3xl font-heading font-semibold">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a confirmation link to <strong>{invite?.email}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to confirm your account. You&apos;ll be redirected back here to join <strong>{invite?.churchName}</strong>.
          </p>
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
            <Button onClick={handleAcceptOnly} disabled={loading} className="w-full">
              {loading ? "Accepting..." : "Accept Invite"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSignupAndAccept} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-body">Full name</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
                autoComplete="name"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-body">Email</label>
              {invite.email ? (
                <Input
                  id="invite-email"
                  type="email"
                  value={invite.email}
                  disabled
                  autoComplete="email"
                  className="bg-muted text-muted-foreground"
                />
              ) : (
                <Input
                  id="invite-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
                  className="bg-white"
                />
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-body">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-body">Confirm password</label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-white"
              />
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create Account & Join"}
            </Button>

            {!invite.email && (
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <a
                  href={`/login?redirect=/invite/${token}`}
                  className="text-primary underline hover:no-underline"
                >
                  Sign in
                </a>
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
