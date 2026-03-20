import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { services, liturgicalDays, availability, rotaEntries, churchMemberships, users } from "@/lib/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";
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

  let upcomingServices: any[] = [];
  let members: any[] = [];
  let availabilityData: any[] = [];
  let rotaData: any[] = [];

  try {
    upcomingServices = await db
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
      .limit(12);

    members = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        voicePart: churchMemberships.voicePart,
        role: churchMemberships.role,
      })
      .from(churchMemberships)
      .innerJoin(users, eq(churchMemberships.userId, users.id))
      .where(eq(churchMemberships.churchId, churchId));

    if (upcomingServices.length > 0) {
      const serviceIds = upcomingServices.map((s) => s.serviceId);
      availabilityData = await db
        .select()
        .from(availability)
        .where(eq(availability.serviceId, serviceIds[0])); // simplified - would need inArray

      rotaData = await db
        .select()
        .from(rotaEntries)
        .where(eq(rotaEntries.serviceId, serviceIds[0])); // simplified
    }
  } catch { /* DB not available */ }

  return (
    <div className="p-8">
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
