import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { services, liturgicalDays, availability, rotaEntries, churchMemberships, users } from "@/lib/db/schema";
import { eq, and, gte, asc, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { RotaGrid } from "./rota-grid";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function RotaPage({ params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");

  interface ServiceRow { serviceId: string; serviceType: string; time: string | null; date: string; cwName: string; }
  interface MemberRow { userId: string; name: string | null; email: string; voicePart: string | null; role: string; }
  interface AvailabilityRow { id: string; userId: string; serviceId: string; status: string; }
  interface RotaRow { id: string; serviceId: string; userId: string; confirmed: boolean; }
  let upcomingServices: ServiceRow[] = [];
  let members: MemberRow[] = [];
  let availabilityData: AvailabilityRow[] = [];
  let rotaData: RotaRow[] = [];

  try {
    // Fetch the service list and member list in parallel — neither depends on the other.
    [upcomingServices, members] = await Promise.all([
      db
        .select({
          serviceId: services.id,
          serviceType: services.serviceType,
          time: services.time,
          date: liturgicalDays.date,
          cwName: liturgicalDays.cwName,
        })
        .from(services)
        .innerJoin(liturgicalDays, eq(services.liturgicalDayId, liturgicalDays.id))
        .where(and(eq(services.churchId, churchId), gte(liturgicalDays.date, today)))
        .orderBy(asc(liturgicalDays.date))
        .limit(12),
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          voicePart: churchMemberships.voicePart,
          role: churchMemberships.role,
        })
        .from(churchMemberships)
        .innerJoin(users, eq(churchMemberships.userId, users.id))
        .where(eq(churchMemberships.churchId, churchId)),
    ]);

    if (upcomingServices.length > 0) {
      const serviceIds = upcomingServices.map((s) => s.serviceId);
      // Availability + rota both depend on serviceIds but not on each other.
      [availabilityData, rotaData] = await Promise.all([
        db.select().from(availability).where(inArray(availability.serviceId, serviceIds)),
        db.select().from(rotaEntries).where(inArray(rotaEntries.serviceId, serviceIds)),
      ]);
    }
  } catch (err) { console.error("Failed to load data:", err); }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-heading font-semibold mb-6">Choir Rota</h1>
      <RotaGrid
        churchId={churchId}
        services={upcomingServices}
        members={members}
        availabilityData={availabilityData}
        rotaData={rotaData}
      />
    </div>
  );
}
