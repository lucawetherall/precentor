import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import {
  getThisSunday,
  getRotaSummary,
  getNeedsAttention,
  getMusicForServices,
  getUserAvailability,
  getUpcomingDaysWithServices,
} from "@/lib/db/queries/overview";
import { DomThisSunday, NeedsAttention } from "./overview-dom";
import { MemberThisSunday, MyAvailabilityList } from "./overview-member";
import { EmptyState } from "@/components/empty-state";
import { Calendar } from "lucide-react";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function ChurchOverviewPage({ params }: Props) {
  const { churchId } = await params;
  const { user, membership, error } = await requireChurchRole(churchId, "MEMBER");
  if (error) redirect("/login");

  const isMember = membership!.role === "MEMBER";
  const userId = user!.id;

  // Fetch "This Sunday" data
  let thisSunday: Awaited<ReturnType<typeof getThisSunday>> = null;
  try {
    thisSunday = await getThisSunday(churchId);
  } catch (err) { console.error("Failed to load data:", err); }

  // Empty state — no liturgical data at all
  if (!thisSunday) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <EmptyState
          icon={Calendar}
          title="No liturgical calendar data"
          description="Run the database seed to populate the calendar."
        />
      </div>
    );
  }

  const serviceIds = thisSunday.services.map((s) => s.serviceId);

  if (isMember) {
    // ── Member view ──
    let musicByService = new Map<string, { slotType: string; title: string }[]>();
    let userAvail = new Map<string, string>();
    let upcomingDays: Awaited<ReturnType<typeof getUpcomingDaysWithServices>> = [];

    try {
      [musicByService, upcomingDays] = await Promise.all([
        getMusicForServices(serviceIds),
        getUpcomingDaysWithServices(churchId, 7),
      ]);

      const allServiceIds = [
        ...serviceIds,
        ...upcomingDays.flatMap((d) => d.serviceIds),
      ];
      const uniqueServiceIds = [...new Set(allServiceIds)];
      userAvail = await getUserAvailability(userId, uniqueServiceIds);
    } catch (err) { console.error("Failed to load data:", err); }

    const initialAvail: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE" | null> = {};
    for (const [sid, status] of userAvail) {
      initialAvail[sid] = status as "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE";
    }

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
        <p className="small-caps text-xs text-muted-foreground mb-1">
          {format(parseISO(thisSunday.date), "d MMM yyyy")} · {thisSunday.cwName}
        </p>
        <h1 className="font-heading text-3xl font-semibold mb-6">This Sunday</h1>
        <MemberThisSunday
          churchId={churchId}
          services={thisSunday.services.map((s) => ({
            ...s,
            musicSlots: musicByService.get(s.serviceId) || [],
          }))}
          userAvailability={initialAvail}
        />
        <MyAvailabilityList
          churchId={churchId}
          days={upcomingDays}
          userAvailability={initialAvail}
        />
      </div>
    );
  }

  // ── DoM view (ADMIN / EDITOR) ──
  let rotaSummaries = new Map<string, { total: number; byPart: Record<string, number> }>();
  let attentionItems: Awaited<ReturnType<typeof getNeedsAttention>> = [];

  try {
    [rotaSummaries, attentionItems] = await Promise.all([
      getRotaSummary(serviceIds, churchId),
      getNeedsAttention(churchId),
    ]);
  } catch (err) { console.error("Failed to load data:", err); }

  // Exclude "this Sunday" from the attention list (already shown as hero)
  const filteredAttention = attentionItems.filter(
    (item) => item.id !== thisSunday?.id
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="font-heading text-2xl font-semibold mb-1">This Sunday</h1>
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-6">
        {format(parseISO(thisSunday.date), "d MMM yyyy")} · {thisSunday.cwName}
      </p>
      <DomThisSunday
        churchId={churchId}
        day={thisSunday}
        services={thisSunday.services}
        rotaSummaries={rotaSummaries}
      />
      <NeedsAttention churchId={churchId} items={filteredAttention} />
    </div>
  );
}
