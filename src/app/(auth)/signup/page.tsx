"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateName = (value: string) => {
    if (!value) return "Name is required";
    return "";
  };

  const validateEmail = (value: string) => {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (value.length < 8) return "Password must be at least 8 characters";
    return "";
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError("Could not create account. Please check your details and try again.");
    } else {
      setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  };

  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-semibold">Create Account</h1>
          <p className="text-sm text-muted-foreground">
            Sign up to set up your church
          </p>
        </div>

        {message ? (
          <div className="p-4 border border-border bg-white text-center space-y-2">
            <p className="text-sm">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-body">Full name</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setFieldErrors((prev) => ({ ...prev, name: validateName(name) }))}
                placeholder="John Smith"
                required
                className="bg-white rounded-none"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-body">Email address</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
                placeholder="director@parish.org.uk"
                required
                className="bg-white rounded-none"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-body">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="bg-white rounded-none"
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
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
                className="bg-white rounded-none"
              />
            </div>

            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline hover:no-underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
