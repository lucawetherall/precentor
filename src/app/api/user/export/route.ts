import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { users, churchMemberships, availability, rotaEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const [profile, memberships, availabilityRecords, rotaData] = await Promise.all([
    db.select().from(users).where(eq(users.id, user!.id)).limit(1),
    db.select().from(churchMemberships).where(eq(churchMemberships.userId, user!.id)),
    db.select().from(availability).where(eq(availability.userId, user!.id)),
    db.select().from(rotaEntries).where(eq(rotaEntries.userId, user!.id)),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: profile[0]
      ? {
          id: profile[0].id,
          email: profile[0].email,
          name: profile[0].name,
          createdAt: profile[0].createdAt,
        }
      : null,
    churchMemberships: memberships.map((m) => ({
      churchId: m.churchId,
      role: m.role,
      voicePart: m.voicePart,
      joinedAt: m.joinedAt,
    })),
    availability: availabilityRecords.map((a) => ({
      serviceId: a.serviceId,
      status: a.status,
    })),
    rotaEntries: rotaData.map((r) => ({
      serviceId: r.serviceId,
      confirmed: r.confirmed,
    })),
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="precentor-data-export.json"',
    },
  });
}
