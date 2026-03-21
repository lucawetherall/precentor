"use client";

import { useState } from "react";

export function InviteMemberForm({ churchId }: { churchId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const handleInvite = async (sendEmail: boolean) => {
    if (!email) return;
    setLoading(true);
    setMessage("");
    setInviteLink("");

    const res = await fetch(`/api/churches/${churchId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, sendEmail }),
    });

    const data = await res.json();
    if (res.ok) {
      const link = `${window.location.origin}/invite/${data.token}`;
      if (sendEmail) {
        setMessage("Invite email sent.");
      } else {
        setInviteLink(link);
        setMessage("Invite link generated.");
      }
      setEmail("");
    } else {
      setMessage(data.error || "Failed to invite member");
    }
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setMessage("Link copied to clipboard.");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
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
          type="button"
          onClick={() => handleInvite(true)}
          disabled={loading || !email}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Send Email"}
        </button>
        <button
          type="button"
          onClick={() => handleInvite(false)}
          disabled={loading || !email}
          className="px-4 py-2 text-sm bg-white text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          Get Link
        </button>
      </div>

      {inviteLink && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={inviteLink}
            readOnly
            className="flex-1 px-3 py-2 text-xs font-mono border border-border bg-muted"
          />
          <button
            type="button"
            onClick={copyLink}
            className="px-3 py-2 text-sm border border-border hover:bg-muted transition-colors"
          >
            Copy
          </button>
        </div>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
