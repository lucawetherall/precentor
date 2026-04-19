"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Preset { id: string; name: string; serviceType: string; defaultTime: string | null; choirRequirement: string; musicListFieldSet: string; }
interface Slot { id: string; catalogRoleId: string; minCount: number; maxCount: number | null; exclusive: boolean; displayOrder: number; }
interface CatalogRole { id: string; key: string; defaultName: string; category: string; rotaEligible: boolean; }

interface Props {
  churchId: string;
  preset: Preset;
  slots: Slot[];
  catalog: CatalogRole[];
}

export function PresetDetailClient({ churchId, preset, slots: initialSlots, catalog }: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState(preset.name);
  const [defaultTime, setDefaultTime] = useState(preset.defaultTime ?? "");
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState(initialSlots);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [addingRoleId, setAddingRoleId] = useState("");

  // Roles not yet in slots
  const usedRoleIds = new Set(slots.map((s) => s.catalogRoleId));
  const availableRoles = catalog.filter((r) => !usedRoleIds.has(r.id));

  async function saveBasic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/churches/${churchId}/presets/${preset.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, defaultTime: defaultTime || null }),
      });
      if (!res.ok) return addToast("Failed to save", "error");
      addToast("Saved", "success");
      router.refresh();
    } finally { setSaving(false); }
  }

  async function addSlot() {
    if (!addingRoleId) return;
    const role = catalog.find((r) => r.id === addingRoleId)!;
    const isVoice = role.category === "VOICE";
    const res = await fetch(`/api/churches/${churchId}/presets/${preset.id}/slots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        catalogRoleId: addingRoleId,
        minCount: 1,
        maxCount: null,
        exclusive: !isVoice,
        displayOrder: (slots.length + 1) * 10,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      return addToast(err.error ?? "Failed to add slot", "error");
    }
    const created = await res.json();
    setSlots((prev) => [...prev, created]);
    setShowAddSlot(false);
    setAddingRoleId("");
    addToast("Slot added", "success");
  }

  async function removeSlot(slotId: string) {
    const res = await fetch(`/api/churches/${churchId}/presets/${preset.id}/slots/${slotId}`, { method: "DELETE" });
    if (!res.ok) return addToast("Failed to remove slot", "error");
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    addToast("Slot removed", "success");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-8">
      <h1 className="text-2xl font-heading font-semibold">{preset.name}</h1>

      {/* Basic section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Basic</h2>
        <form onSubmit={saveBasic} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Default time</label>
            <input className="w-full border rounded px-3 py-2" value={defaultTime} onChange={(e) => setDefaultTime(e.target.value)} placeholder="10:00" />
          </div>
          <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </section>

      {/* Slots section */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Role slots</h2>
        {slots.length === 0 ? (
          <p className="text-muted-foreground text-sm">No role slots defined.</p>
        ) : (
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Role</th>
                <th className="text-left px-3 py-2">Min</th>
                <th className="text-left px-3 py-2">Max</th>
                <th className="text-left px-3 py-2">Exclusive</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {slots.map((slot) => {
                const role = catalog.find((r) => r.id === slot.catalogRoleId);
                const isVoice = role?.category === "VOICE";
                return (
                  <tr key={slot.id}>
                    <td className="px-3 py-2">{role?.defaultName ?? slot.catalogRoleId}</td>
                    <td className="px-3 py-2">{slot.minCount}</td>
                    <td className="px-3 py-2">{slot.maxCount ?? "∞"}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={slot.exclusive}
                        disabled={isVoice}
                        title={isVoice ? "Voice parts cannot be exclusive" : undefined}
                        readOnly
                        aria-label="exclusive"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeSlot(slot.id)} className="text-destructive text-xs">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {showAddSlot ? (
          <div className="mt-3 flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select className="border rounded px-2 py-1.5 text-sm" value={addingRoleId} onChange={(e) => setAddingRoleId(e.target.value)}>
                <option value="">Select role…</option>
                {availableRoles.map((r) => <option key={r.id} value={r.id}>{r.defaultName}</option>)}
              </select>
            </div>
            <button onClick={addSlot} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Add</button>
            <button onClick={() => setShowAddSlot(false)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowAddSlot(true)} className="mt-3 rounded border px-3 py-1.5 text-sm">
            + Add slot
          </button>
        )}
      </section>
    </div>
  );
}
