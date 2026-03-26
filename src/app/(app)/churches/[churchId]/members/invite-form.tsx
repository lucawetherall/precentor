"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function InviteMemberForm({ churchId }: { churchId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const { addToast } = useToast();

  const handleInvite = async (sendEmail: boolean) => {
    if (!email) return;
    setLoading(true);
    setInviteLink("");

    try {
      const res = await fetch(`/api/churches/${churchId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, sendEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/invite/${data.token}`;
        if (sendEmail) {
          addToast("Invite email sent", "success");
        } else {
          setInviteLink(link);
          addToast("Invite link generated — copy and share it", "success");
        }
        setEmail("");
      } else {
        addToast(data.error || "Failed to invite member", "error");
      }
    } catch {
      addToast("Network error — could not send invite", "error");
    }
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    addToast("Link copied to clipboard", "success");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
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
            autoComplete="email"
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
            className="w-full sm:w-auto px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
          >
            <option value="MEMBER">Member</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleInvite(true)}
            disabled={loading || !email}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
            Send Email
          </button>
          <button
            type="button"
            onClick={() => handleInvite(false)}
            disabled={loading || !email}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-white text-foreground border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Get Link
          </button>
        </div>
      </div>

      {inviteLink && (
        <div className="flex gap-2 items-center">
          <label htmlFor="invite-link" className="sr-only">Invite link</label>
          <input
            id="invite-link"
            type="text"
            value={inviteLink}
            readOnly
            aria-label="Invite link"
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

    </div>
  );
}
