"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/use-confirm";
import { Button, buttonVariants } from "@/components/ui/button";

interface Preset {
  id: string;
  name: string;
  serviceType: string;
  defaultTime: string | null;
  choirRequirement: string;
  musicListFieldSet: string;
  archivedAt: Date | null;
}

export function PresetsClient({ churchId, presets }: { churchId: string; presets: Preset[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function archive(id: string, name: string) {
    if (archivingId) return;
    if (
      !(await confirm({
        title: "Archive this preset?",
        description: `“${name}” will be hidden from the preset list and stop generating new services. Existing services are unaffected.`,
        confirmLabel: "Archive",
      }))
    ) {
      return;
    }
    setArchivingId(id);
    try {
      const res = await fetch(`/api/churches/${churchId}/presets/${id}/archive`, { method: "POST" });
      if (!res.ok) return addToast("Failed to archive preset", "error");
      addToast("Preset archived", "success");
      router.refresh();
    } catch {
      addToast("Failed to archive preset", "error");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-semibold">Service presets</h1>
        <Link
          href={`/churches/${churchId}/settings/service-presets/new`}
          className={buttonVariants({ variant: "default" })}
        >
          Create preset
        </Link>
      </header>
      {presets.length === 0 ? (
        <p className="text-muted-foreground">No presets yet. Create one to get started.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {presets.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {p.serviceType} · {p.defaultTime ?? "no default time"} · {p.choirRequirement}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/churches/${churchId}/settings/service-presets/${p.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Edit
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={archivingId === p.id}
                  onClick={() => archive(p.id, p.name)}
                >
                  {archivingId === p.id ? "Archiving…" : "Archive"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
