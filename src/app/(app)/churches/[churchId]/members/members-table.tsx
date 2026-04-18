"use client";

import { useState } from "react";
import { Users, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface MemberRow {
  id: string;
  role: string;
  voicePart: string | null;
  joinedAt: Date;
  userName: string | null;
  userEmail: string;
}

const ROLES = ["MEMBER", "EDITOR", "ADMIN"] as const;
const VOICE_PARTS = ["SOPRANO", "ALTO", "TENOR", "BASS"] as const;

export function MembersTable({
  initialMembers,
  churchId,
  isAdmin,
}: {
  initialMembers: MemberRow[];
  churchId: string;
  isAdmin: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const { addToast } = useToast();

  const updateMember = async (memberId: string, field: "role" | "voicePart", value: string | null) => {
    const prev = members.find((m) => m.id === memberId);
    if (!prev) return;

    // Optimistic update
    setMembers((ms) =>
      ms.map((m) => (m.id === memberId ? { ...m, [field]: value } : m))
    );

    try {
      const res = await fetch(`/api/churches/${churchId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        addToast(`${field === "role" ? "Role" : "Voice part"} updated`, "success");
      } else {
        setMembers((ms) => ms.map((m) => (m.id === memberId ? prev : m)));
        addToast("Failed to update member", "error");
      }
    } catch {
      setMembers((ms) => ms.map((m) => (m.id === memberId ? prev : m)));
      addToast("Network error", "error");
    }
  };

  const removeMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/churches/${churchId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((ms) => ms.filter((m) => m.id !== memberId));
        addToast("Member removed", "success");
      } else {
        addToast("Failed to remove member", "error");
      }
    } catch {
      addToast("Network error", "error");
    }
    setRemovingId(null);
    setConfirmRemoveId(null);
  };

  if (members.length === 0) {
    return (
      <div className="mt-8 border border-border bg-card p-8 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-muted-foreground">
          No members yet. {isAdmin ? "Invite someone above to get started." : "Ask an admin to send you an invite."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted text-foreground">
            <th className="px-3 py-2 text-left font-body font-normal">Name</th>
            <th className="px-3 py-2 text-left font-body font-normal hidden sm:table-cell">Email</th>
            <th className="px-3 py-2 text-left font-body font-normal">Role</th>
            <th className="px-3 py-2 text-left font-body font-normal">Voice Part</th>
            {isAdmin && <th className="px-3 py-2 w-10" aria-label="Actions"></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id} className={cn("transition-colors hover:bg-muted/50", i % 2 === 0 ? "bg-card" : "bg-background")}>
              <td className="px-3 py-2">
                <div>{m.userName || "—"}</div>
                <div className="font-mono text-sm text-muted-foreground sm:hidden">{m.userEmail}</div>
              </td>
              <td className="px-3 py-2 font-mono text-xs hidden sm:table-cell">{m.userEmail}</td>
              <td className="px-3 py-2">
                {isAdmin ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateMember(m.id, "role", e.target.value)}
                    aria-label={`Role for ${m.userName || m.userEmail}`}
                    className="text-xs rounded-md border border-input px-1.5 py-1 bg-card shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs">{m.role}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {isAdmin ? (
                  <select
                    value={m.voicePart || ""}
                    onChange={(e) => updateMember(m.id, "voicePart", e.target.value || null)}
                    aria-label={`Voice part for ${m.userName || m.userEmail}`}
                    className="text-xs rounded-md border border-input px-1.5 py-1 bg-card shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    {VOICE_PARTS.map((vp) => (
                      <option key={vp} value={vp}>{vp}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs">{m.voicePart || "—"}</span>
                )}
              </td>
              {isAdmin && (
                <td className="px-2 py-2">
                  {confirmRemoveId === m.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(m.id)}
                      className="w-10 h-10 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Remove member"
                      aria-label={`Remove ${m.userName || m.userEmail}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
