"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <input
          id="name"
          name="name"
          defaultValue={church.name}
          required
          className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="diocese" className="text-sm font-body">Diocese</label>
        <input
          id="diocese"
          name="diocese"
          defaultValue={church.diocese || ""}
          className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-body">Address</label>
        <textarea
          id="address"
          name="address"
          defaultValue={church.address || ""}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none resize-y"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="ccliNumber" className="text-sm font-body">CCLI Number</label>
        <input
          id="ccliNumber"
          name="ccliNumber"
          defaultValue={church.ccliNumber || ""}
          className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
        />
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
