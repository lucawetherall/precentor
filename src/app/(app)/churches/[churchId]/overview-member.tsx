"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import { LITURGICAL_COLOURS, MUSIC_SLOT_LABELS, SERVICE_TYPE_LABELS } from "@/types";
import type { LiturgicalColour, MusicSlotType, ServiceType } from "@/types";
import { AvailabilityWidget } from "@/components/availability-widget";

interface ServiceWithMusic {
  serviceId: string;
  serviceType: string;
  time: string | null;
  musicSlots: { slotType: string; title: string }[];
}

interface UpcomingDay {
  id: string;
  date: string;
  cwName: string;
  colour: string;
  serviceIds: string[];
}

export function MemberThisSunday({
  churchId,
  day,
  services,
  userAvailability,
}: {
  churchId: string;
  day: { date: string; cwName: string };
  services: ServiceWithMusic[];
  userAvailability: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null>;
}) {
  return (
    <div className="mb-8 space-y-2">
      {services.map((s) => (
        <div key={s.serviceId} className="border border-border bg-card p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="font-heading text-base font-semibold">
                {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
              </span>
              {s.time && (
                <span className="text-xs text-muted-foreground ml-2">{s.time}</span>
              )}
            </div>
            <AvailabilityWidget
              serviceId={s.serviceId}
              churchId={churchId}
              currentStatus={userAvailability[s.serviceId] ?? null}
              size="md"
            />
          </div>

          {s.musicSlots.length > 0 ? (
            <div className="space-y-1 mb-3">
              {s.musicSlots.map((slot, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="font-mono text-muted-foreground uppercase tracking-wider min-w-[70px]">
                    {MUSIC_SLOT_LABELS[slot.slotType as MusicSlotType] || slot.slotType}
                  </span>
                  <span className="text-foreground">{slot.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic mb-3">Music not yet planned</p>
          )}

          <div className="pt-3 border-t border-border">
            <a
              href={`/api/churches/${churchId}/services/${s.serviceId}/sheet?format=pdf`}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              Download service sheet
            </a>
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <div className="border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No services planned for this Sunday yet.</p>
        </div>
      )}
    </div>
  );
}

export function MyAvailabilityList({
  churchId,
  days,
  userAvailability,
}: {
  churchId: string;
  days: UpcomingDay[];
  userAvailability: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null>;
}) {
  const remainingDays = days.slice(1);
  if (remainingDays.length === 0) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-semibold mb-3">My availability</h2>
      <div className="border border-border bg-card divide-y divide-border">
        {remainingDays.map((day) => (
          <div key={day.id} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="w-1 h-6 flex-shrink-0"
              style={{
                backgroundColor:
                  LITURGICAL_COLOURS[day.colour as LiturgicalColour] ?? "#4A6741",
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm">
                {format(parseISO(day.date), "d MMM")} — {day.cwName}
              </span>
            </div>
            {day.serviceIds.length > 0 ? (
              <AvailabilityWidget
                serviceId={day.serviceIds[0]}
                churchId={churchId}
                currentStatus={userAvailability[day.serviceIds[0]] ?? null}
                size="sm"
              />
            ) : (
              <span className="text-xs text-muted-foreground italic">No services</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
