import { requireChurchRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { migrationAuditLog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

const CODE_EXPLANATIONS: Record<string, { label: string; detail: string }> = {
  MEMBER_NO_VOICE_PART: { label: "Member without voice part", detail: "This member had no voice part set before migration. Their roles could not be inferred automatically." },
  PRESET_TIME_AMBIGUOUS: { label: "Ambiguous preset time", detail: "Multiple service patterns disagreed on the start time for this preset. The default time was left blank." },
  ROTA_ENTRY_UNCLASSIFIED: { label: "Unclassified rota entry", detail: "A rota entry could not be mapped to a catalog role and was quarantined." },
};

export default async function MigrationIssuesPage({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  const entries = await db
    .select()
    .from(migrationAuditLog)
    .where(and(eq(migrationAuditLog.churchId, churchId), isNull(migrationAuditLog.dismissedAt)));

  const counts = { INFO: 0, WARN: 0, ERROR: 0 };
  for (const e of entries) counts[e.severity as keyof typeof counts]++;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-heading font-semibold">Migration issues</h1>
      <div className="flex gap-4 text-sm">
        {(["ERROR", "WARN", "INFO"] as const).map((sev) => (
          <div key={sev} className={`rounded-md px-3 py-2 ${sev === "ERROR" ? "bg-destructive/10" : sev === "WARN" ? "bg-yellow-50" : "bg-blue-50"}`}>
            <span className="font-medium">{sev}:</span> {counts[sev]}
          </div>
        ))}
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">No unresolved migration issues.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {entries.map((e) => {
            const expl = CODE_EXPLANATIONS[e.code];
            return (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase ${e.severity === "ERROR" ? "text-destructive" : e.severity === "WARN" ? "text-yellow-700" : "text-blue-700"}`}>{e.severity}</span>
                  <span className="font-medium text-sm">{expl?.label ?? e.code}</span>
                </div>
                {expl && <p className="mt-1 text-sm text-muted-foreground">{expl.detail}</p>}
                {e.details != null && typeof e.details === "object" && Object.keys(e.details as Record<string, unknown>).length > 0 && (
                  <pre className="mt-1 rounded bg-muted px-2 py-1 text-xs overflow-auto">{JSON.stringify(e.details as Record<string, unknown>, null, 2)}</pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
