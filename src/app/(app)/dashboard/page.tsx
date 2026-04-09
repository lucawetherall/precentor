import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Church, Calendar, Users, Music, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { NavCard } from "@/components/nav-card";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { users, churchMemberships, churches, services, liturgicalDays } from "@/lib/db/schema";
import { eq, and, gte, asc, inArray } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { SERVICE_TYPE_LABELS, LITURGICAL_COLOURS } from "@/types";
import type { ServiceType, LiturgicalColour } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user needs onboarding
  interface UserChurch {
    churchId: string;
    churchName: string;
    role: string;
  }
  let userChurches: UserChurch[] = [];
  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, user.id))
      .limit(1);

    if (dbUser.length > 0) {
      const memberships = await db
        .select({
          churchId: churches.id,
          churchName: churches.name,
          role: churchMemberships.role,
        })
        .from(churchMemberships)
        .innerJoin(churches, eq(churchMemberships.churchId, churches.id))
        .where(eq(churchMemberships.userId, dbUser[0].id));

      if (memberships.length === 0) {
        redirect("/onboarding");
      }
      userChurches = memberships;

      // Redirect single-church users straight to their church overview
      if (userChurches.length === 1) {
        redirect(`/churches/${userChurches[0].churchId}`);
      }
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  }

  // Fetch upcoming services across all churches
  const today = format(new Date(), "yyyy-MM-dd");
  interface UpcomingService {
    serviceId: string;
    serviceType: string;
    time: string | null;
    date: string;
    cwName: string;
    colour: string;
    churchId: string;
    churchName: string;
  }
  let upcomingServices: UpcomingService[] = [];

  try {
    if (userChurches.length > 0) {
      const churchIds = userChurches.slice(0, 5).map((uc) => uc.churchId);
      const churchNameMap = new Map(userChurches.map((uc) => [uc.churchId, uc.churchName]));

      // Single query for all churches
      const allServices = await db
        .select({
          serviceId: services.id,
          serviceType: services.serviceType,
          time: services.time,
          date: liturgicalDays.date,
          cwName: liturgicalDays.cwName,
          colour: liturgicalDays.colour,
          churchId: services.churchId,
        })
        .from(services)
        .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
        .where(and(inArray(services.churchId, churchIds), gte(liturgicalDays.date, today)))
        .orderBy(asc(liturgicalDays.date))
        .limit(6);

      upcomingServices = allServices.map((s) => ({
        ...s,
        churchName: churchNameMap.get(s.churchId) || "",
      }));
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "there";

  return (
    <main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-1">
        Welcome, {userName}
      </h1>
      <p className="text-muted-foreground mb-8">
        Here&apos;s what&apos;s coming up across your churches.
      </p>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {userChurches.slice(0, 1).map((uc) => (
          <NavCard
            key={`sundays-${uc.churchId}`}
            href={`/churches/${uc.churchId}/services`}
            icon={Calendar}
            title="Plan Services"
            subtitle={uc.churchName}
            showArrow={false}
          />
        ))}
        {userChurches.slice(0, 1).map((uc) => (
          <NavCard
            key={`rota-${uc.churchId}`}
            href={`/churches/${uc.churchId}/rota`}
            icon={Users}
            title="Choir Rota"
            subtitle={uc.churchName}
            showArrow={false}
          />
        ))}
        {userChurches.slice(0, 1).map((uc) => (
          <NavCard
            key={`repertoire-${uc.churchId}`}
            href={`/churches/${uc.churchId}/repertoire`}
            icon={Music}
            title="Repertoire"
            subtitle={uc.churchName}
            showArrow={false}
          />
        ))}
      </div>

      {/* Upcoming Services */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4">Upcoming Services</h2>
        {upcomingServices.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming services"
            description="Once you plan a Sunday, it will appear here."
            action={
              userChurches.length > 0 ? (
                <Link
                  href={`/churches/${userChurches[0].churchId}/services`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Plan a service
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {upcomingServices.map((s) => {
              const colour = LITURGICAL_COLOURS[s.colour as LiturgicalColour] || "#4A6741";
              return (
                <Link
                  key={s.serviceId}
                  href={`/churches/${s.churchId}/services/${s.date}`}
                  className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
                >
                  <span
                    role="img"
                    aria-label={`liturgical colour ${s.colour.toLowerCase()}`}
                    className="w-2 h-10 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: colour }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-base">{s.cwName}</p>
                    <p className="text-sm text-muted-foreground">
                      {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                      {s.time && ` at ${s.time}`}
                    </p>
                    <p className="small-caps text-xs text-muted-foreground">
                      {format(parseISO(s.date), "EEE d MMM yyyy")}
                      {userChurches.length > 1 && ` — ${s.churchName}`}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Churches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Your Churches</h2>
          <Link
            href="/churches"
            className="text-sm text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
          >
            Manage
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {userChurches.map((uc) => (
            <Link
              key={uc.churchId}
              href={`/churches/${uc.churchId}`}
              className="flex items-center gap-3 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
            >
              <Church className="h-6 w-6 text-muted-foreground flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-heading font-semibold truncate">{uc.churchName}</p>
                <p className="text-xs text-muted-foreground">
                  {uc.role === "ADMIN" ? "Admin" : uc.role === "EDITOR" ? "Editor" : "Member"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
