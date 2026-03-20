"use client";

import { useState } from "react";

export function InviteMemberForm({ churchId }: { churchId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch(`/api/churches/${churchId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Member invited successfully.");
      setEmail("");
    } else {
      setMessage(data.error || "Failed to invite member");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleInvite} className="flex gap-2 items-end">
      <div className="flex-1">
        <label htmlFor="invite-email" className="block text-sm font-body mb-1">
          Invite by email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="singer@parish.org.uk"
          required
          className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="block text-sm font-body mb-1">Role</label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
        >
          <option value="MEMBER">Member</option>
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Invite"}
      </button>
      {message && <p className="text-sm text-muted-foreground ml-2">{message}</p>}
    </form>
  );
}
