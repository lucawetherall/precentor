"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateEmail = (value: string) => {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email";
    }
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return "Password is required";
    }
    return "";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <FormField id="email" label="Email address" required error={fieldErrors.email || null}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
          placeholder="director@parish.org.uk"
          required
        />
      </FormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-body">Password</label>
          <Link href="/forgot-password" className="text-xs text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
          placeholder="Enter your password"
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
        {fieldErrors.password && (
          <p id="password-error" role="alert" className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-semibold">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and password
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-sm text-center text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary">Create one</Link>
        </p>
      </div>
    </main>
  );
}
