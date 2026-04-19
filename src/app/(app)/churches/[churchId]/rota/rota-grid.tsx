"use client";
import React, { useState } from "react";
import { AvailabilityWidget } from "@/components/availability-widget";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
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

interface MemberV2 {
  userId: string;
  name: string | null;
  email: string;
  roles: { id: string; catalogRoleId: string; catalogRoleKey: string; catalogRoleName: string; isPrimary: boolean }[];
}

interface AvailabilityEntry { id: string; userId: string; serviceId: string; status: string; }
interface RotaEntry { id: string; serviceId: string; userId: string; confirmed: boolean; catalogRoleId: string | null; }

export function RotaGridV2({
  churchId,
  services,
  members,
  availabilityData,
  rotaData,
}: {
  churchId: string;
  services: ServiceV2[];
  members: MemberV2[];
  availabilityData: AvailabilityEntry[];
  rotaData: RotaEntry[];
}) {
  const [viewMode, setViewMode] = useState<"member" | "role">("member");

  // Build availability lookup: userId-serviceId → status
  const availLookup: Record<string, string | null> = {};
  for (const a of availabilityData) {
    availLookup[`${a.userId}-${a.serviceId}`] = a.status;
  }

  // Build rota lookup: userId-serviceId → RotaEntry[]
  const rotaLookup: Record<string, RotaEntry[]> = {};
  for (const r of rotaData) {
    const key = `${r.userId}-${r.serviceId}`;
    (rotaLookup[key] ??= []).push(r);
  }

  function isEligible(member: MemberV2, service: ServiceV2): boolean {
    const memberRoleIds = new Set(member.roles.map((r) => r.catalogRoleId));
    return service.slots.some((s) => memberRoleIds.has(s.catalogRoleId));
  }

  function getRosterLabel(member: MemberV2, service: ServiceV2): string | null {
    const entries = rotaLookup[`${member.userId}-${service.serviceId}`];
    if (!entries || entries.length === 0) return null;
    // Find matching role name(s)
    const roleNames = entries.flatMap((entry) => {
      if (!entry.catalogRoleId) return [];
      const role = member.roles.find((r) => r.catalogRoleId === entry.catalogRoleId);
      return role ? [role.catalogRoleName] : [];
    });
    const confirmed = entries.some((e) => e.confirmed);
    const label = roleNames.length > 0 ? roleNames.join(", ") : "Rostered";
    return confirmed ? `${label} ✓` : label;
  }

  if (services.length === 0) {
    return <p className="text-muted-foreground">No upcoming services.</p>;
  }

  const serviceTypeLabel = (type: string) =>
    SERVICE_TYPE_LABELS[type as ServiceType] ?? type.replace(/_/g, " ");

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
                <tr key={member.userId} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">{member.name ?? member.email}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.roles.map((r) => (
                        <span key={r.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {r.catalogRoleName}{r.isPrimary ? " ★" : ""}
                        </span>
                      ))}
                    </div>
                  </td>
                  {services.map((svc) => {
                    const eligible = isEligible(member, svc);
                    const rosterLabel = getRosterLabel(member, svc);
                    return (
                      <td key={svc.serviceId} className="px-1 py-2 text-center align-top">
                        <AvailabilityWidget
                          serviceId={svc.serviceId}
                          churchId={churchId}
                          currentStatus={(availLookup[`${member.userId}-${svc.serviceId}`] as any) ?? null}
                          size="sm"
                          eligible={eligible}
                          eligibleReason={eligible ? undefined : "NO_ROLE"}
                        />
                        {rosterLabel && (
                          <div className="mt-0.5 text-xs text-secondary font-medium leading-tight">
                            {rosterLabel}
                          </div>
                        )}
                      </td>
                    );
                  })}
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
                          <tr key={`${role.catalogRoleId}-${member.userId}`} className="hover:bg-muted/20">
                            <td className="px-3 py-2 text-sm">
                              <span className="font-medium">{member.name ?? member.email}</span>
                              {otherRoles.length > 0 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  also {otherRoles.map((r) => r.catalogRoleName).join(", ")}
                                </span>
                              )}
                            </td>
                            {services.map((svc) => {
                              const eligible = isEligible(member, svc);
                              const rosterLabel = getRosterLabel(member, svc);
                              return (
                                <td key={svc.serviceId} className="px-1 py-2 text-center align-top">
                                  <AvailabilityWidget
                                    serviceId={svc.serviceId}
                                    churchId={churchId}
                                    currentStatus={(availLookup[`${member.userId}-${svc.serviceId}`] as any) ?? null}
                                    size="sm"
                                    eligible={eligible}
                                    eligibleReason={eligible ? undefined : "NO_ROLE"}
                                  />
                                  {rosterLabel && (
                                    <div className="mt-0.5 text-xs text-secondary font-medium leading-tight">
                                      {rosterLabel}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
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
    </div>
  );
}
