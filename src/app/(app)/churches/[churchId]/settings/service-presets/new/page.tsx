"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const SERVICE_TYPES = ["SUNG_EUCHARIST","CHORAL_EVENSONG","SAID_EUCHARIST","CHORAL_MATINS","FAMILY_SERVICE","COMPLINE","CUSTOM"] as const;
const CHOIR_REQS = ["FULL_CHOIR","ORGANIST_ONLY","SAID"] as const;
const MUSIC_FIELDS = ["CHORAL","HYMNS_ONLY","READINGS_ONLY"] as const;

export default function NewPresetPage() {
  const { churchId } = useParams() as { churchId: string };
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("SUNG_EUCHARIST");
  const [choirRequirement, setChoirRequirement] = useState("FULL_CHOIR");
  const [musicListFieldSet, setMusicListFieldSet] = useState("CHORAL");
  const [defaultTime, setDefaultTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/churches/${churchId}/presets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name, serviceType, choirRequirement, musicListFieldSet,
          defaultTime: defaultTime || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error ?? "Failed to create preset", "error");
        return;
      }
      const created = await res.json();
      addToast("Preset created", "success");
      router.push(`/churches/${churchId}/settings/service-presets/${created.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Create preset form" className="p-4 sm:p-6 lg:p-8 max-w-lg space-y-4">
      <h1 className="text-2xl font-heading font-semibold">Create preset</h1>
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Service type</label>
        <select className="w-full border rounded px-3 py-2" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
          {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Choir requirement</label>
        <select className="w-full border rounded px-3 py-2" value={choirRequirement} onChange={(e) => setChoirRequirement(e.target.value)}>
          {CHOIR_REQS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Music list field set</label>
        <select className="w-full border rounded px-3 py-2" value={musicListFieldSet} onChange={(e) => setMusicListFieldSet(e.target.value)}>
          {MUSIC_FIELDS.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Default time (HH:MM, optional)</label>
        <input type="time" className="w-full border rounded px-3 py-2" value={defaultTime} onChange={(e) => setDefaultTime(e.target.value)} placeholder="10:00" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {submitting ? "Creating…" : "Create preset"}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded border px-4 py-2 text-sm">Cancel</button>
      </div>
    </form>
  );
}
