"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [diocese, setDiocese] = useState("");
  const [address, setAddress] = useState("");
  const [ccliNumber, setCcliNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Church name is required.");
      return;
    }
    setNameError(null);

    setLoading(true);
    setError("");

    const res = await fetch("/api/churches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), diocese, address, ccliNumber }),
    });

    if (res.ok) {
      const church = await res.json();
      router.push(`/churches/${church.id}/services`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create church.");
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <p className="small-caps text-xs text-muted-foreground">Welcome</p>
          <h1 className="text-3xl font-heading font-semibold">Set Up Your Church</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be the administrator for this church.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="church-name" label="Church name" required error={nameError}>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="St Mary's Parish Church"
              autoComplete="organization"
              required
              size="lg"
            />
          </FormField>

          <FormField id="diocese" label="Diocese">
            <Input
              type="text"
              value={diocese}
              onChange={(e) => setDiocese(e.target.value)}
              placeholder="e.g. Diocese of London"
              autoComplete="off"
              size="lg"
            />
          </FormField>

          <FormField id="address" label="Address">
            <Input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Church Lane, Town, County"
              autoComplete="street-address"
              size="lg"
            />
          </FormField>

          <FormField id="ccli" label="CCLI Number" hint="Optional">
            <Input
              type="text"
              value={ccliNumber}
              onChange={(e) => setCcliNumber(e.target.value)}
              autoComplete="off"
              size="lg"
            />
          </FormField>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "Creating..." : "Create Church"}
          </Button>
        </form>
      </div>
    </main>
  );
}
