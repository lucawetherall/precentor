"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

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

  async function archive(id: string) {
    const res = await fetch(`/api/churches/${churchId}/presets/${id}/archive`, { method: "POST" });
    if (!res.ok) return addToast("Failed to archive preset", "error");
    addToast("Preset archived", "success");
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-semibold">Service presets</h1>
        <a
          href={`/churches/${churchId}/settings/service-presets/new`}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create preset
        </a>
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
                <a
                  href={`/churches/${churchId}/settings/service-presets/${p.id}`}
                  className="rounded border px-3 py-1 text-sm hover:bg-accent"
                >
                  Edit
                </a>
                <button
                  onClick={() => archive(p.id)}
                  className="rounded border px-3 py-1 text-sm hover:bg-accent"
                >
                  Archive
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
