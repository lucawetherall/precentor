"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Church {
  id: string;
  name: string;
  diocese: string | null;
  address: string | null;
  ccliNumber: string | null;
}

export function ChurchSettingsForm({ church }: { church: Church }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/churches/${church.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        diocese: formData.get("diocese"),
        address: formData.get("address"),
        ccliNumber: formData.get("ccliNumber"),
      }),
    });

    if (res.ok) {
      setMessage("Settings saved.");
      router.refresh();
    } else {
      setMessage("Failed to save.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-body">Church Name</label>
        <Input
          id="name"
          name="name"
          defaultValue={church.name}
          required
          autoComplete="organization"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="diocese" className="text-sm font-body">Diocese</label>
        <Input
          id="diocese"
          name="diocese"
          defaultValue={church.diocese || ""}
          autoComplete="off"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-body">Address</label>
        <textarea
          id="address"
          name="address"
          defaultValue={church.address || ""}
          rows={2}
          autoComplete="street-address"
          className="w-full rounded-md px-3 py-2 text-sm border border-input bg-transparent shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="ccliNumber" className="text-sm font-body">CCLI Number</label>
        <Input
          id="ccliNumber"
          name="ccliNumber"
          defaultValue={church.ccliNumber || ""}
          autoComplete="off"
        />
      </div>

      {message && (
        <p role="alert" className={`text-sm ${message === "Settings saved." ? "text-success" : "text-destructive"}`}>
          {message}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
