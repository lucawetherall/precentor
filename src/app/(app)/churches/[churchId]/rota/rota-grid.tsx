"use client";
import React, { useState } from "react";
import { AvailabilityWidget } from "@/components/availability-widget";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { format, parseISO } from "date-fns";
import { Plus, X } from "lucide-react";
import { SERVICE_TYPE_LABELS } from "@/types";
import type { ServiceType } from "@/types";

interface ServiceV2 {
  serviceId: string;
  serviceType: string;
  time: string | null;
  date: string;
  cwName: string;
  slots: { catalogRoleId: string; catalogRoleKey: string }[];
}

interface MemberRoleV2 {
  id: string;
  catalogRoleId: string;
  catalogRoleKey: string;
  catalogRoleName: string;
  isPrimary: boolean;
}

interface MemberV2 {
  userId: string;
  name: string | null;
  email: string;
  roles: MemberRoleV2[];
}

interface AvailabilityEntry { id: string; userId: string; serviceId: string; status: string; }
interface RotaEntry { id: string; serviceId: string; userId: string; confirmed: boolean; catalogRoleId: string | null; }

export function RotaGridV2({
  churchId,
  services,
  members,
  availabilityData,
  rotaData,
  currentUserId,
  canEditOthers,
}: {
  churchId: string;
  services: ServiceV2[];
  members: MemberV2[];
  availabilityData: AvailabilityEntry[];
  rotaData: RotaEntry[];
  currentUserId: string;
  canEditOthers: boolean;
}) {
  const [viewMode, setViewMode] = useState<"member" | "role">("member");
  // Rota assignments are mutable from this grid (assign/unassign), so hold them
  // in local state seeded from the server and update optimistically.
  const [rota, setRota] = useState<RotaEntry[]>(rotaData);
  // Key of the cell currently saving, so its controls can disable.
  const [pending, setPending] = useState<string | null>(null);
  const { addToast } = useToast();

  // Build availability lookup: userId-serviceId → status
  const availLookup: Record<string, string | null> = {};
  for (const a of availabilityData) {
    availLookup[`${a.userId}-${a.serviceId}`] = a.status;
  }

  // Build rota lookup: userId-serviceId → RotaEntry[]
  const rotaLookup: Record<string, RotaEntry[]> = {};
  for (const r of rota) {
    const key = `${r.userId}-${r.serviceId}`;
    (rotaLookup[key] ??= []).push(r);
  }

  function isEligible(member: MemberV2, service: ServiceV2): boolean {
    const memberRoleIds = new Set(member.roles.map((r) => r.catalogRoleId));
    return service.slots.some((s) => memberRoleIds.has(s.catalogRoleId));
  }

  async function assign(member: MemberV2, service: ServiceV2, catalogRoleId: string) {
    const key = `${member.userId}-${service.serviceId}-${catalogRoleId}`;
    setPending(key);
    try {
      const res = await fetch(`/api/churches/${churchId}/rota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId, serviceId: service.serviceId, catalogRoleId }),
      });
      if (res.ok) {
        setRota((prev) => [
          ...prev,
          // id is only used as a React key here; the server row is authoritative
          // on next load. Use a composite so it's unique and stable.
          { id: key, serviceId: service.serviceId, userId: member.userId, confirmed: true, catalogRoleId },
        ]);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg =
          res.status === 409
            ? ((data as { error?: string }).error ?? "That role is already filled.")
            : res.status === 403
              ? "That singer doesn't hold this role."
              : "Couldn't update the rota.";
        addToast(msg, res.status === 409 ? "warning" : "error");
      }
    } catch {
      addToast("Couldn't update the rota.", "error");
    } finally {
      setPending(null);
    }
  }

  async function unassign(member: MemberV2, service: ServiceV2, catalogRoleId: string) {
    const key = `${member.userId}-${service.serviceId}-${catalogRoleId}`;
    setPending(key);
    try {
      const res = await fetch(`/api/churches/${churchId}/rota`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId, serviceId: service.serviceId, catalogRoleId }),
      });
      if (res.ok) {
        setRota((prev) =>
          prev.filter(
            (e) =>
              !(e.userId === member.userId && e.serviceId === service.serviceId && e.catalogRoleId === catalogRoleId),
          ),
        );
      } else {
        addToast("Couldn't update the rota.", "error");
      }
    } catch {
      addToast("Couldn't update the rota.", "error");
    } finally {
      setPending(null);
    }
  }

  if (services.length === 0) {
    return <p className="text-muted-foreground">No upcoming services.</p>;
  }

  const serviceTypeLabel = (type: string) =>
    SERVICE_TYPE_LABELS[type as ServiceType] ?? type.replace(/_/g, " ");

  function Cell({ member, service }: { member: MemberV2; service: ServiceV2 }) {
    const eligible = isEligible(member, service);
    const isSelf = member.userId === currentUserId;
    const entries = rotaLookup[`${member.userId}-${service.serviceId}`] ?? [];
    const rosteredRoleIds = new Set(entries.map((e) => e.catalogRoleId));
    // Roles the member holds that match a slot on this service.
    const eligibleRoles = member.roles.filter((r) =>
      service.slots.some((s) => s.catalogRoleId === r.catalogRoleId),
    );
    const unassignedEligible = eligibleRoles.filter((r) => !rosteredRoleIds.has(r.catalogRoleId));
    const roleName = (id: string | null) =>
      member.roles.find((r) => r.catalogRoleId === id)?.catalogRoleName ?? "Rostered";

    return (
      <td className="px-1 py-2 text-center align-top">
        <AvailabilityWidget
          serviceId={service.serviceId}
          churchId={churchId}
          currentStatus={(availLookup[`${member.userId}-${service.serviceId}`] as "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null) ?? null}
          size="sm"
          eligible={eligible}
          eligibleReason={eligible ? undefined : "NO_ROLE"}
          userId={isSelf ? undefined : member.userId}
          subjectName={isSelf ? undefined : (member.name ?? member.email)}
          readOnly={!isSelf && !canEditOthers}
        />

        {/* Roster assignments */}
        {entries.length > 0 && (
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {entries.map((e) => {
              const name = roleName(e.catalogRoleId);
              const removable = canEditOthers && e.catalogRoleId != null;
              return (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-0.5 rounded-full bg-secondary/15 text-secondary px-1.5 py-0.5 text-[11px] font-medium leading-none"
                  title={e.confirmed ? `${name} (confirmed)` : name}
                >
                  {name}{e.confirmed ? " ✓" : ""}
                  {removable && (
                    <button
                      type="button"
                      onClick={() => unassign(member, service, e.catalogRoleId!)}
                      disabled={pending === `${member.userId}-${service.serviceId}-${e.catalogRoleId}`}
                      className="ml-0.5 text-secondary/70 hover:text-destructive disabled:opacity-50"
                      aria-label={`Unassign ${member.name ?? member.email} from ${name}`}
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Assign controls (editors only) */}
        {canEditOthers && unassignedEligible.length > 0 && (
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {unassignedEligible.map((r) => (
              <button
                key={r.catalogRoleId}
                type="button"
                onClick={() => assign(member, service, r.catalogRoleId)}
                disabled={pending === `${member.userId}-${service.serviceId}-${r.catalogRoleId}`}
                className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-secondary hover:text-secondary transition-colors disabled:opacity-50"
                title={`Assign to ${r.catalogRoleName}`}
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={2} />
                {r.catalogRoleName}
              </button>
            ))}
          </div>
        )}
      </td>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button
          variant={viewMode === "member" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("member")}
        >
          By member
        </Button>
        <Button
          variant={viewMode === "role" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("role")}
        >
          By role
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-3 py-2 w-48">
                {viewMode === "member" ? "Member" : "Role / Member"}
              </th>
              {services.map((s) => (
                <th key={s.serviceId} className="px-2 py-2 text-center text-xs min-w-[72px]">
                  <div className="font-semibold">{format(parseISO(s.date), "d MMM")}</div>
                  <div className="text-muted-foreground font-normal">{serviceTypeLabel(s.serviceType)}</div>
                  {s.time && <div className="text-muted-foreground font-normal">{s.time}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {viewMode === "member" ? (
              members.map((member) => (
                <tr
                  key={member.userId}
                  className={member.userId === currentUserId ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/20"}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">
                      {member.name ?? member.email}
                      {member.userId === currentUserId && (
                        <span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium align-middle">You</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.roles.map((r) => (
                        <span key={r.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {r.catalogRoleName}{r.isPrimary ? " ★" : ""}
                        </span>
                      ))}
                    </div>
                  </td>
                  {services.map((svc) => (
                    <Cell key={svc.serviceId} member={member} service={svc} />
                  ))}
                </tr>
              ))
            ) : (
              // Role-grouped view
              (() => {
                const allRoleKeys = Array.from(
                  new Map(members.flatMap((m) => m.roles.map((r) => [r.catalogRoleId, r]))).values()
                );
                return allRoleKeys.map((role) => {
                  const roleMembers = members.filter((m) => m.roles.some((r) => r.catalogRoleId === role.catalogRoleId));
                  if (roleMembers.length === 0) return null;
                  return (
                    <React.Fragment key={role.catalogRoleId}>
                      <tr className="bg-muted/30">
                        <td colSpan={services.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {role.catalogRoleName}
                        </td>
                      </tr>
                      {roleMembers.map((member) => {
                        const otherRoles = member.roles.filter((r) => r.catalogRoleId !== role.catalogRoleId);
                        return (
                          <tr
                            key={`${role.catalogRoleId}-${member.userId}`}
                            className={member.userId === currentUserId ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : "hover:bg-muted/20"}
                          >
                            <td className="px-3 py-2 text-sm">
                              <span className="font-medium">{member.name ?? member.email}</span>
                              {member.userId === currentUserId && (
                                <span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium align-middle">You</span>
                              )}
                              {otherRoles.length > 0 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  also {otherRoles.map((r) => r.catalogRoleName).join(", ")}
                                </span>
                              )}
                            </td>
                            {services.map((svc) => (
                              <Cell key={svc.serviceId} member={member} service={svc} />
                            ))}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      {canEditOthers && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tap <span className="inline-flex items-center gap-0.5"><Plus className="h-3 w-3" strokeWidth={2} />a role</span> to roster an eligible singer; tap the <X className="inline h-3 w-3" strokeWidth={2} /> on a pill to remove them.
        </p>
      )}
    </div>
  );
}
