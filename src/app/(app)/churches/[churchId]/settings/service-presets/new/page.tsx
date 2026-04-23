"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SERVICE_TYPE_LABELS } from "@/types";

const SERVICE_TYPES = ["SUNG_EUCHARIST", "CHORAL_EVENSONG", "SAID_EUCHARIST", "CHORAL_MATINS", "FAMILY_SERVICE", "COMPLINE", "CUSTOM"] as const;
const CHOIR_REQUIREMENT_LABELS: Record<string, string> = {
  FULL_CHOIR: "Full choir",
  ORGANIST_ONLY: "Organist only",
  SAID: "Said (no music)",
};
const MUSIC_FIELD_SET_LABELS: Record<string, string> = {
  CHORAL: "Choral",
  HYMNS_ONLY: "Hymns only",
  READINGS_ONLY: "Readings only",
};

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
    <form onSubmit={handleSubmit} aria-label="Create preset form" className="p-4 sm:p-6 lg:p-8 max-w-lg space-y-5">
      <h1 className="text-2xl font-heading font-semibold">Create preset</h1>

      <div className="space-y-1.5">
        <Label htmlFor="preset-name" required>Name</Label>
        <Input
          id="preset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Sunday Sung Eucharist"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preset-service-type">Service type</Label>
        <Select
          id="preset-service-type"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
        >
          {SERVICE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {SERVICE_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preset-choir-req">Choir requirement</Label>
        <Select
          id="preset-choir-req"
          value={choirRequirement}
          onChange={(e) => setChoirRequirement(e.target.value)}
        >
          {Object.entries(CHOIR_REQUIREMENT_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preset-music-fields">Music list field set</Label>
        <Select
          id="preset-music-fields"
          value={musicListFieldSet}
          onChange={(e) => setMusicListFieldSet(e.target.value)}
        >
          {Object.entries(MUSIC_FIELD_SET_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="preset-time">Default time (optional)</Label>
        <Input
          id="preset-time"
          type="time"
          value={defaultTime}
          onChange={(e) => setDefaultTime(e.target.value)}
          placeholder="10:00"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create preset"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
