import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePageAuth } from "@/lib/auth/page-auth";
import { MusicListFormClient } from "./music-list-form-client";
import { PageHeader } from "@/components/page-header";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function MusicListPage({ params }: Props) {
  const { churchId } = await params;

  // The music list is a planning deliverable; a Director of Music (often an
  // EDITOR, not ADMIN) needs it. Gate at EDITOR.
  await requirePageAuth({ churchId, role: "EDITOR" });

  let churchName = "";
  try {
    const churchRows = await db
      .select({ name: churches.name })
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);
    if (churchRows.length > 0) churchName = churchRows[0].name;
  } catch (err) {
    logger.error("[music-list/page] Failed to load church", err);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <PageHeader
        eyebrow="Choir & Organ"
        title="Music List"
        subtitle="A printable announcement of choral and organ music for a date range — the PDF includes every service with music planned in the period you select."
      />

      <MusicListFormClient churchId={churchId} churchName={churchName} />
    </div>
  );
}
