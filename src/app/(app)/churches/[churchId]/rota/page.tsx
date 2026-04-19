import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { services, liturgicalDays, availability, rotaEntries, churchMemberships, users, churchMemberRoles, roleCatalog, serviceRoleSlots } from "@/lib/db/schema";
import { eq, and, gte, asc, inArray } from "drizzle-orm";
import { format } from "date-fns";
import { RotaGridV2 } from "./rota-grid-v2";

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
  interface MemberRow { userId: string; name: string | null; email: string; role: string; }
  interface AvailabilityRow { id: string; userId: string; serviceId: string; status: string; }
  interface RotaRow { id: string; serviceId: string; userId: string; confirmed: boolean; catalogRoleId: string | null; }
  let upcomingServices: ServiceRow[] = [];
  let members: MemberRow[] = [];
  let availabilityData: AvailabilityRow[] = [];
  let rotaData: RotaRow[] = [];

  let memberRolesData: { userId: string; id: string; catalogRoleId: string; catalogRoleKey: string; catalogRoleName: string; isPrimary: boolean }[] = [];
  let serviceSlots: { serviceId: string; catalogRoleId: string; catalogRoleKey: string }[] = [];

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
        .where(inArray(availability.serviceId, serviceIds));

      rotaData = await db
        .select({
          id: rotaEntries.id,
          serviceId: rotaEntries.serviceId,
          userId: rotaEntries.userId,
          confirmed: rotaEntries.confirmed,
          catalogRoleId: rotaEntries.catalogRoleId,
        })
        .from(rotaEntries)
        .where(inArray(rotaEntries.serviceId, serviceIds));

      memberRolesData = await db
        .select({
          userId: churchMemberRoles.userId,
          id: churchMemberRoles.id,
          catalogRoleId: churchMemberRoles.catalogRoleId,
          catalogRoleKey: roleCatalog.key,
          catalogRoleName: roleCatalog.defaultName,
          isPrimary: churchMemberRoles.isPrimary,
        })
        .from(churchMemberRoles)
        .innerJoin(roleCatalog, eq(roleCatalog.id, churchMemberRoles.catalogRoleId))
        .where(eq(churchMemberRoles.churchId, churchId));

      serviceSlots = await db
        .select({
          serviceId: serviceRoleSlots.serviceId,
          catalogRoleId: serviceRoleSlots.catalogRoleId,
          catalogRoleKey: roleCatalog.key,
        })
        .from(serviceRoleSlots)
        .innerJoin(roleCatalog, eq(roleCatalog.id, serviceRoleSlots.catalogRoleId))
        .where(inArray(serviceRoleSlots.serviceId, serviceIds));
    }
  } catch (err) { console.error("Failed to load data:", err); }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <h1 className="text-3xl font-heading font-semibold mb-6">Choir Rota</h1>
      <RotaGridV2
        churchId={churchId}
        services={upcomingServices.map((s) => ({
          ...s,
          slots: serviceSlots.filter((sl) => sl.serviceId === s.serviceId),
        }))}
        members={members.map((m) => ({
          ...m,
          roles: memberRolesData.filter((r) => r.userId === m.userId),
        }))}
        availabilityData={availabilityData}
        rotaData={rotaData}
      />
    </div>
  );
}
