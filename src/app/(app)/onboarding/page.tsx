"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [diocese, setDiocese] = useState("");
  const [address, setAddress] = useState("");
  const [ccliNumber, setCcliNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Church name is required.");
      return;
    }

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
          <h1 className="text-3xl font-heading font-semibold">Set Up Your Church</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be the administrator for this church.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="church-name" className="text-sm font-body">
              Church name <span className="text-destructive">*</span>
            </label>
            <input
              id="church-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="St Mary's Parish Church"
              autoComplete="organization"
              required
              className="w-full h-9 rounded-md px-3 py-1 text-sm border border-input bg-white shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="diocese" className="text-sm font-body">Diocese</label>
            <input
              id="diocese"
              type="text"
              value={diocese}
              onChange={(e) => setDiocese(e.target.value)}
              placeholder="e.g. Diocese of London"
              autoComplete="off"
              className="w-full h-9 rounded-md px-3 py-1 text-sm border border-input bg-white shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-body">Address</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Church Lane, Town, County"
              autoComplete="street-address"
              className="w-full h-9 rounded-md px-3 py-1 text-sm border border-input bg-white shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ccli" className="text-sm font-body">CCLI Number</label>
            <input
              id="ccli"
              type="text"
              value={ccliNumber}
              onChange={(e) => setCcliNumber(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              className="w-full h-9 rounded-md px-3 py-1 text-sm border border-input bg-white shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Church"}
          </Button>
        </form>
      </div>
    </main>
  );
}
