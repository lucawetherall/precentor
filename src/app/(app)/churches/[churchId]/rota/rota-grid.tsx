"use client";

import { useState, Fragment } from "react";
import { Check, X, Minus, UserCheck, Users } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { format, parseISO } from "date-fns";
import { formatLiturgicalDayName } from "@/lib/liturgical-display";
import { EmptyState } from "@/components/empty-state";

interface Service {
  serviceId: string;
  serviceType: string;
  time: string | null;
  date: string;
  cwName: string;
}

interface Member {
  userId: string;
  name: string | null;
  email: string;
  voicePart: string | null;
  role: string;
}

interface AvailabilityEntry { id: string; userId: string; serviceId: string; status: string; }
interface RotaEntry { id: string; serviceId: string; userId: string; confirmed: boolean; }

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";

const AVAIL_LABEL: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  TENTATIVE: "Tentative",
};

export function RotaGrid({
  churchId,
  services,
  members,
  availabilityData,
  rotaData,
}: {
  churchId: string;
  services: Service[];
  members: Member[];
  availabilityData: AvailabilityEntry[];
  rotaData: RotaEntry[];
}) {
  const [avail, setAvail] = useState<Record<string, AvailabilityStatus>>(() => {
    const initial: Record<string, AvailabilityStatus> = {};
    for (const a of availabilityData) {
      initial[`${a.userId}-${a.serviceId}`] = a.status as AvailabilityStatus;
    }
    return initial;
  });
  const [rota, setRota] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const r of rotaData) {
      initial[`${r.userId}-${r.serviceId}`] = r.confirmed;
    }
    return initial;
  });
  const { addToast } = useToast();
  const getAvailKey = (userId: string, serviceId: string) => `${userId}-${serviceId}`;

  const cycleAvailability = async (userId: string, serviceId: string) => {
    const key = getAvailKey(userId, serviceId);
    const current = avail[key] || "AVAILABLE";
    const next: AvailabilityStatus =
      current === "AVAILABLE" ? "UNAVAILABLE" :
      current === "UNAVAILABLE" ? "TENTATIVE" : "AVAILABLE";

    setAvail((prev) => ({ ...prev, [key]: next }));

    try {
      const res = await fetch(`/api/churches/${churchId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serviceId, status: next }),
      });
      if (!res.ok) {
        setAvail((prev) => ({ ...prev, [key]: current }));
        addToast("Failed to update availability", "error");
      }
    } catch {
      setAvail((prev) => ({ ...prev, [key]: current }));
      addToast("Network error — could not update availability", "error");
    }
  };

  const toggleRota = async (userId: string, serviceId: string) => {
    const key = getAvailKey(userId, serviceId);
    const current = rota[key] || false;
    setRota((prev) => ({ ...prev, [key]: !current }));

    try {
      const res = await fetch(`/api/churches/${churchId}/rota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serviceId, confirmed: !current }),
      });
      if (!res.ok) {
        setRota((prev) => ({ ...prev, [key]: current }));
        addToast("Failed to update rota", "error");
      }
    } catch {
      setRota((prev) => ({ ...prev, [key]: current }));
      addToast("Network error — could not update rota", "error");
    }
  };

  // Group members by voice part
  const grouped: Record<string, Member[]> = {};
  for (const m of members) {
    const part = m.voicePart || "Unassigned";
    if (!grouped[part]) grouped[part] = [];
    grouped[part].push(m);
  }

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No upcoming services"
        description="Create services from the Services page first to build a rota."
      />
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground" aria-label="Legend">
        <span className="font-heading font-semibold text-foreground text-sm" aria-hidden="true">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 flex items-center justify-center border border-success text-success" aria-hidden="true">
            <Check className="h-3 w-3" strokeWidth={2} />
          </span>
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 flex items-center justify-center border border-destructive text-destructive" aria-hidden="true">
            <X className="h-3 w-3" strokeWidth={2} />
          </span>
          Unavailable
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 flex items-center justify-center border border-warning text-warning" aria-hidden="true">
            <Minus className="h-3 w-3" strokeWidth={2} />
          </span>
          Tentative
        </span>
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 flex items-center justify-center bg-primary text-primary-foreground border border-primary" aria-hidden="true">
            <UserCheck className="h-3 w-3" strokeWidth={2} />
          </span>
          On rota
        </span>
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="bg-muted text-foreground">
              <th className="px-3 py-2 text-left font-body font-normal sticky left-0 bg-muted z-10 min-w-[160px]">Member</th>
              {services.map((s) => (
                <th key={s.serviceId} className="px-2 py-2 text-center font-body font-normal min-w-[80px]">
                  <div className="text-xs">{format(parseISO(s.date), "d MMM")}</div>
                  <div className="small-caps text-xs opacity-80">{s.serviceType.replace(/_/g, " ")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([part, partMembers]) => (
              <Fragment key={part}>
                <tr>
                  <td colSpan={services.length + 1} className="px-3 py-1 text-xs font-heading font-semibold bg-muted">
                    {part}
                  </td>
                </tr>
                {partMembers.map((member, mi) => (
                  <tr key={member.userId} className={mi % 2 === 0 ? "bg-card" : "bg-background"}>
                    <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10 border-r border-border">
                      {member.name || member.email}
                    </td>
                    {services.map((s) => {
                      const key = getAvailKey(member.userId, s.serviceId);
                      const status = avail[key] || "AVAILABLE";
                      const onRota = rota[key] || false;

                      return (
                        <td key={s.serviceId} className="px-1 py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => cycleAvailability(member.userId, s.serviceId)}
                              title={`${AVAIL_LABEL[status]} — click to change`}
                              className={`w-8 h-8 flex items-center justify-center border text-xs ${
                                status === "AVAILABLE"
                                  ? "border-success text-success"
                                  : status === "UNAVAILABLE"
                                  ? "border-destructive text-destructive"
                                  : "border-warning text-warning"
                              }`}
                              aria-label={`${member.name || member.email}: ${AVAIL_LABEL[status]} for ${s.cwName}. Click to change.`}
                            >
                              {status === "AVAILABLE" ? (
                                <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                              ) : status === "UNAVAILABLE" ? (
                                <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <Minus className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              onClick={() => toggleRota(member.userId, s.serviceId)}
                              title={onRota ? "Remove from rota" : "Add to rota"}
                              className={`w-8 h-8 flex items-center justify-center border ${
                                onRota
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                              }`}
                              aria-label={`${onRota ? "Remove" : "Add"} ${member.name || member.email} ${onRota ? "from" : "to"} rota for ${s.cwName}`}
                            >
                              <UserCheck className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-4">
        {services.map((s) => (
          <div key={s.serviceId} className="border border-border bg-card shadow-sm">
            <div className="px-4 py-3 bg-muted text-foreground">
              <p className="font-heading font-semibold">{format(parseISO(s.date), "EEE d MMM")}</p>
              <p className="text-xs opacity-80">{formatLiturgicalDayName(s.cwName, s.date)} — {s.serviceType.replace(/_/g, " ")}</p>
            </div>
            <div className="divide-y divide-border">
              {Object.entries(grouped).map(([part, partMembers]) => (
                <div key={part}>
                  <div className="px-4 py-1.5 text-xs font-heading font-semibold bg-muted">{part}</div>
                  {partMembers.map((member) => {
                    const key = getAvailKey(member.userId, s.serviceId);
                    const status = avail[key] || "AVAILABLE";
                    const onRota = rota[key] || false;

                    return (
                      <div key={member.userId} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm truncate flex-1 mr-3">{member.name || member.email}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => cycleAvailability(member.userId, s.serviceId)}
                            className={`px-2 py-1 text-xs border flex items-center gap-1 ${
                              status === "AVAILABLE"
                                ? "border-success text-success"
                                : status === "UNAVAILABLE"
                                ? "border-destructive text-destructive"
                                : "border-warning text-warning"
                            }`}
                            aria-label={`${member.name || member.email}: ${AVAIL_LABEL[status]}. Click to change.`}
                          >
                            {status === "AVAILABLE" ? (
                              <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            ) : status === "UNAVAILABLE" ? (
                              <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            ) : (
                              <Minus className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            )}
                            <span>{AVAIL_LABEL[status]}</span>
                          </button>
                          <button
                            onClick={() => toggleRota(member.userId, s.serviceId)}
                            className={`w-7 h-7 flex items-center justify-center border ${
                              onRota
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground"
                            }`}
                            aria-label={`${onRota ? "Remove" : "Add"} ${member.name || member.email} ${onRota ? "from" : "to"} rota for ${s.cwName}`}
                          >
                            <UserCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
