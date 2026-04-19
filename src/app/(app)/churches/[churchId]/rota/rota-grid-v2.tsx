"use client";
import { useState } from "react";
import { AvailabilityWidget } from "@/components/availability-widget";
import { format, parseISO } from "date-fns";

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

  function isEligible(member: MemberV2, service: ServiceV2): boolean {
    const memberRoleIds = new Set(member.roles.map((r) => r.catalogRoleId));
    return service.slots.some((s) => memberRoleIds.has(s.catalogRoleId));
  }

  if (services.length === 0) {
    return <p className="text-muted-foreground">No upcoming services.</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode("member")}
          className={`rounded border px-3 py-1.5 text-sm ${viewMode === "member" ? "bg-primary text-primary-foreground" : ""}`}
        >
          View by member
        </button>
        <button
          onClick={() => setViewMode("role")}
          className={`rounded border px-3 py-1.5 text-sm ${viewMode === "role" ? "bg-primary text-primary-foreground" : ""}`}
        >
          View by role
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 w-36">Member</th>
              {services.map((s) => (
                <th key={s.serviceId} className="px-2 py-2 text-center text-xs">
                  <div>{format(parseISO(s.date), "d MMM")}</div>
                  <div className="text-muted-foreground">{s.serviceType.replace(/_/g, " ")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {viewMode === "member" ? (
              members.map((member) => (
                <tr key={member.userId}>
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
                    return (
                      <td key={svc.serviceId} className="px-1 py-2 text-center">
                        <AvailabilityWidget
                          serviceId={svc.serviceId}
                          churchId={churchId}
                          currentStatus={(availLookup[`${member.userId}-${svc.serviceId}`] as any) ?? null}
                          size="sm"
                          eligible={eligible}
                          eligibleReason={eligible ? undefined : "NO_ROLE"}
                        />
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
                    <>
                      <tr key={`header-${role.catalogRoleId}`} className="bg-muted/30">
                        <td colSpan={services.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {role.catalogRoleName}
                        </td>
                      </tr>
                      {roleMembers.map((member) => (
                        <tr key={`${role.catalogRoleId}-${member.userId}`}>
                          <td className="px-3 py-2 text-sm">
                            <span>{member.name ?? member.email}</span>
                            {member.roles.filter((r) => r.catalogRoleId !== role.catalogRoleId).map((r) => (
                              <span key={r.id} className="ml-1 text-xs text-muted-foreground">also {r.catalogRoleName}</span>
                            ))}
                          </td>
                          {services.map((svc) => {
                            const eligible = isEligible(member, svc);
                            return (
                              <td key={svc.serviceId} className="px-1 py-2 text-center">
                                <AvailabilityWidget
                                  serviceId={svc.serviceId}
                                  churchId={churchId}
                                  currentStatus={(availLookup[`${member.userId}-${svc.serviceId}`] as any) ?? null}
                                  size="sm"
                                  eligible={eligible}
                                  eligibleReason={eligible ? undefined : "NO_ROLE"}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
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
