"use client";

import { useState } from "react";
import { Copy, Link2, Loader2, Mail } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export function InviteMemberForm({ churchId }: { churchId: string }) {
  // Quick invite state
  const [quickRole, setQuickRole] = useState("MEMBER");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickInviteLink, setQuickInviteLink] = useState("");

  // Email invite state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [showEmailInvite, setShowEmailInvite] = useState(false);

  const { addToast } = useToast();

  const handleQuickInvite = async () => {
    setQuickLoading(true);
    setQuickInviteLink("");

    try {
      const res = await fetch(`/api/churches/${churchId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: quickRole }),
      });

      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/invite/${data.token}`;
        setQuickInviteLink(link);
        addToast("Invite link generated — copy and share it", "success");
      } else {
        addToast(data.error || "Failed to generate link", "error");
      }
    } catch {
      addToast("Network error — could not generate link", "error");
    }
    setQuickLoading(false);
  };

  const handleEmailInvite = async (sendEmail: boolean) => {
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

  const copyToClipboard = async (link: string) => {
    await navigator.clipboard.writeText(link);
    addToast("Link copied to clipboard", "success");
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Quick Invite Link — primary action */}
      <div className="border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-sm font-heading font-semibold">Invite Link</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Generate a sign-up link to share with choir members. Anyone with the link can join.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div>
            <label htmlFor="quick-role" className="block text-sm font-body mb-1">Role</label>
            <select
              id="quick-role"
              value={quickRole}
              onChange={(e) => setQuickRole(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:ring-1 focus:ring-ring"
            >
              <option value="MEMBER">Member</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button onClick={handleQuickInvite} disabled={quickLoading} size="sm">
            {quickLoading && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
            Generate Link
          </Button>
        </div>

        {quickInviteLink && (
          <div className="flex gap-2 items-center">
            <label htmlFor="quick-invite-link" className="sr-only">Invite link</label>
            <input
              id="quick-invite-link"
              type="text"
              value={quickInviteLink}
              readOnly
              aria-label="Invite link"
              className="flex-1 px-3 py-2 text-xs font-mono border border-border bg-muted"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(quickInviteLink)}
            >
              <Copy className="h-3 w-3" strokeWidth={1.5} />
              Copy
            </Button>
          </div>
        )}
      </div>

      {/* Email Invite — secondary action */}
      {!showEmailInvite ? (
        <button
          type="button"
          onClick={() => setShowEmailInvite(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="h-3 w-3" strokeWidth={1.5} />
          Or invite by email
        </button>
      ) : (
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="text-sm font-heading font-semibold">Invite by Email</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1">
              <label htmlFor="invite-email" className="block text-sm font-body mb-1">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="singer@parish.org.uk"
                autoComplete="email"
                required
                className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="block text-sm font-body mb-1">Role</label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:ring-1 focus:ring-ring"
              >
                <option value="MEMBER">Member</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleEmailInvite(true)} disabled={loading || !email} size="sm">
                {loading && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />}
                Send Email
              </Button>
              <Button variant="outline" onClick={() => handleEmailInvite(false)} disabled={loading || !email} size="sm">
                Get Link
              </Button>
            </div>
          </div>

          {inviteLink && (
            <div className="flex gap-2 items-center">
              <label htmlFor="email-invite-link" className="sr-only">Invite link</label>
              <input
                id="email-invite-link"
                type="text"
                value={inviteLink}
                readOnly
                aria-label="Invite link"
                className="flex-1 px-3 py-2 text-xs font-mono border border-border bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(inviteLink)}
              >
                <Copy className="h-3 w-3" strokeWidth={1.5} />
                Copy
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
