"use client";

import { useState, Fragment } from "react";
import { Check, X, Minus } from "lucide-react";

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
      }
    } catch {
      setAvail((prev) => ({ ...prev, [key]: current }));
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
      }
    } catch {
      setRota((prev) => ({ ...prev, [key]: current }));
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
      <div className="border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No upcoming services. Create services from the Sundays page first.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-border">
        <thead>
          <tr className="bg-foreground text-background">
            <th className="px-3 py-2 text-left font-body font-normal sticky left-0 bg-foreground z-10 min-w-[160px]">Member</th>
            {services.map((s) => (
              <th key={s.serviceId} className="px-2 py-2 text-center font-body font-normal min-w-[80px]">
                <div className="text-xs">{s.date}</div>
                <div className="text-[10px] opacity-80">{s.serviceType.replace(/_/g, " ")}</div>
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
                <tr key={member.userId} className={mi % 2 === 0 ? "bg-white" : "bg-background"}>
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
                            className={`w-6 h-6 flex items-center justify-center border text-xs ${
                              status === "AVAILABLE"
                                ? "border-[#4A6741] text-[#4A6741]"
                                : status === "UNAVAILABLE"
                                ? "border-destructive text-destructive"
                                : "border-[#D4AF37] text-[#D4AF37]"
                            }`}
                            aria-label={`${member.name || member.email}: ${
                              status === "AVAILABLE" ? "Available" :
                              status === "UNAVAILABLE" ? "Unavailable" : "Tentative"
                            } for ${s.cwName} on ${s.date}. Click to change.`}
                          >
                            {status === "AVAILABLE" ? (
                              <Check className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            ) : status === "UNAVAILABLE" ? (
                              <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            ) : (
                              <Minus className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {status === "AVAILABLE" ? "Available" : status === "UNAVAILABLE" ? "Unavailable" : "Tentative"}
                            </span>
                          </button>
                          <button
                            onClick={() => toggleRota(member.userId, s.serviceId)}
                            className={`w-5 h-5 border text-[10px] ${
                              onRota
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground"
                            }`}
                            aria-label={`${onRota ? "Remove" : "Add"} ${member.name || member.email} ${onRota ? "from" : "to"} rota for ${s.cwName}`}
                          >
                            <span aria-hidden="true">R</span>
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
  );
}
