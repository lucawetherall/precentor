import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Church, Calendar, Users, Music, ArrowRight } from "lucide-react";
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
          <Link
            key={`sundays-${uc.churchId}`}
            href={`/churches/${uc.churchId}/sundays`}
            className="flex items-center gap-3 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
          >
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-heading font-semibold">Plan Services</p>
              <p className="text-xs text-muted-foreground truncate">{uc.churchName}</p>
            </div>
          </Link>
        ))}
        {userChurches.slice(0, 1).map((uc) => (
          <Link
            key={`rota-${uc.churchId}`}
            href={`/churches/${uc.churchId}/rota`}
            className="flex items-center gap-3 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
          >
            <Users className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-heading font-semibold">Choir Rota</p>
              <p className="text-xs text-muted-foreground truncate">{uc.churchName}</p>
            </div>
          </Link>
        ))}
        {userChurches.slice(0, 1).map((uc) => (
          <Link
            key={`repertoire-${uc.churchId}`}
            href={`/churches/${uc.churchId}/repertoire`}
            className="flex items-center gap-3 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
          >
            <Music className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-heading font-semibold">Repertoire</p>
              <p className="text-xs text-muted-foreground truncate">{uc.churchName}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming Services */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4">Upcoming Services</h2>
        {upcomingServices.length === 0 ? (
          <div className="border border-border bg-card p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-muted-foreground">
              No upcoming services planned.{" "}
              {userChurches.length > 0 && (
                <Link href={`/churches/${userChurches[0].churchId}/sundays`} className="text-primary underline">
                  Plan your first service
                </Link>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingServices.map((s) => {
              const colour = LITURGICAL_COLOURS[s.colour as LiturgicalColour] || "#4A6741";
              return (
                <Link
                  key={s.serviceId}
                  href={`/churches/${s.churchId}/sundays/${s.date}`}
                  className="flex items-center gap-4 border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
                >
                  <span
                    className="w-2 h-10 flex-shrink-0"
                    style={{ backgroundColor: colour }}
                    aria-hidden="true"
                    title={s.colour}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-base">{s.cwName}</p>
                    <p className="text-sm text-muted-foreground">
                      {SERVICE_TYPE_LABELS[s.serviceType as ServiceType] || s.serviceType}
                      {s.time && ` at ${s.time}`}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
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
            className="text-sm text-primary hover:underline"
          >
            Manage
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {userChurches.map((uc) => (
            <Link
              key={uc.churchId}
              href={`/churches/${uc.churchId}/sundays`}
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
