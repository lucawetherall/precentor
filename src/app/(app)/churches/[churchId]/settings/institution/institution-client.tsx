"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface Role { id: string; key: string; defaultName: string; category: string; }
interface Appointee { assignmentId: string; userId: string; catalogRoleId: string; userName: string | null; userEmail: string; }
interface Member { id: string; name: string | null; email: string; }

// Group roles by category
const CATEGORY_LABELS: Record<string, string> = {
  CLERGY_PARISH: "Parish clergy",
  CLERGY_CATHEDRAL: "Cathedral clergy",
  MUSIC_DIRECTION: "Music direction",
  MUSIC_INSTRUMENT: "Musicians",
  LAY_MINISTRY: "Lay ministry",
};

export function InstitutionClient({
  churchId,
  institutionalRoles,
  appointees: initialAppointees,
  members,
}: {
  churchId: string;
  institutionalRoles: Role[];
  appointees: Appointee[];
  members: Member[];
}) {
  const { addToast } = useToast();
  const [appointees, setAppointees] = useState(initialAppointees);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byCategory: Record<string, Role[]> = {};
  for (const r of institutionalRoles) {
    (byCategory[r.category] ??= []).push(r);
  }

  async function assign(userId: string, catalogRoleId: string) {
    const res = await fetch(`/api/churches/${churchId}/members/${userId}/roles`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ catalogRoleId }),
    });
    if (!res.ok) return addToast("Failed to assign role", "error");
    const created = await res.json();
    const member = members.find((m) => m.id === userId);
    setAppointees((prev) => [...prev, {
      assignmentId: created.id,
      userId,
      catalogRoleId,
      userName: member?.name ?? null,
      userEmail: member?.email ?? "",
    }]);
    addToast("Appointee added", "success");
  }

  async function revoke(assignmentId: string, userId: string) {
    const res = await fetch(`/api/churches/${churchId}/members/${userId}/roles/${assignmentId}`, { method: "DELETE" });
    if (!res.ok) return addToast("Failed to remove appointee", "error");
    setAppointees((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
    addToast("Appointee removed", "success");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-heading font-semibold">Institution</h1>
      <p className="text-muted-foreground text-sm">Assign institutional roles (clergy, director of music, etc.) to church members.</p>

      {Object.entries(byCategory).map(([cat, roles]) => {
        const isExpanded = expanded[cat] ?? cat !== "CLERGY_CATHEDRAL";
        return (
          <section key={cat}>
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [cat]: !isExpanded }))}
              className="flex w-full items-center justify-between text-left"
            >
              <h2 className="text-base font-semibold">{CATEGORY_LABELS[cat] ?? cat}</h2>
              <span className="text-muted-foreground text-sm">{isExpanded ? "▲" : "▼"}</span>
            </button>
            {isExpanded && (
              <div className="mt-3 space-y-4">
                {roles.map((role) => {
                  const roleAppointees = appointees.filter((a) => a.catalogRoleId === role.id);
                  return (
                    <div key={role.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{role.defaultName}</span>
                        <AddAppointeeButton
                          members={members}
                          existing={roleAppointees.map((a) => a.userId)}
                          onAdd={(userId) => assign(userId, role.id)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {roleAppointees.map((a) => (
                          <span key={a.assignmentId} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                            {a.userName ?? a.userEmail}
                            <button
                              onClick={() => revoke(a.assignmentId, a.userId)}
                              aria-label={`Remove ${a.userName ?? a.userEmail}`}
                              className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AddAppointeeButton({ members, existing, onAdd }: { members: Member[]; existing: string[]; onAdd: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const available = members.filter((m) => !existing.includes(m.id));

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (available.length === 0) return null;
  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        + Add
      </Button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-10 min-w-40 rounded-md border bg-popover shadow-md overflow-hidden"
        >
          {available.map((m) => (
            <button
              key={m.id}
              role="option"
              aria-selected={false}
              onClick={() => { onAdd(m.id); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent outline-none"
            >
              {m.name ?? m.email}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
