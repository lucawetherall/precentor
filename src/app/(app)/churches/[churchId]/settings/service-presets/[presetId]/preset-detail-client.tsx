"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [addingMin, setAddingMin] = useState(1);
  const [addingMax, setAddingMax] = useState<string>(""); // empty = unlimited
  const [addingExclusive, setAddingExclusive] = useState(true);

  // Roles not yet in slots
  const usedRoleIds = new Set(slots.map((s) => s.catalogRoleId));
  const availableRoles = catalog.filter((r) => !usedRoleIds.has(r.id) && r.rotaEligible);

  // Reflect VOICE category constraint
  const addingRole = catalog.find((r) => r.id === addingRoleId);
  const addingIsVoice = addingRole?.category === "VOICE";

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
    const exclusive = addingIsVoice ? false : addingExclusive;
    const res = await fetch(`/api/churches/${churchId}/presets/${preset.id}/slots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        catalogRoleId: addingRoleId,
        minCount: addingMin,
        maxCount: addingMax === "" ? null : parseInt(addingMax, 10),
        exclusive,
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
    setAddingMin(1);
    setAddingMax("");
    setAddingExclusive(true);
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
        <form onSubmit={saveBasic} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="preset-name" required>Name</Label>
            <Input id="preset-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preset-time">Default time</Label>
            <Input
              id="preset-time"
              type="time"
              value={defaultTime}
              onChange={(e) => setDefaultTime(e.target.value)}
              placeholder="10:00"
            />
          </div>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? "Saving…" : "Save changes"}
          </Button>
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
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {slots.map((slot) => {
                const role = catalog.find((r) => r.id === slot.catalogRoleId);
                const isVoice = role?.category === "VOICE";
                return (
                  <tr key={slot.id}>
                    <td className="px-3 py-2 font-medium">{role?.defaultName ?? slot.catalogRoleId}</td>
                    <td className="px-3 py-2">{slot.minCount}</td>
                    <td className="px-3 py-2">{slot.maxCount ?? "∞"}</td>
                    <td className="px-3 py-2">
                      {isVoice ? (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      ) : (
                        <span className={slot.exclusive ? "text-foreground" : "text-muted-foreground"}>
                          {slot.exclusive ? "Yes" : "No"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlot(slot.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {showAddSlot ? (
          <div className="mt-4 border rounded-md p-4 space-y-4 bg-muted/20">
            <h3 className="text-sm font-semibold">Add role slot</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="add-role">Role</Label>
                <Select
                  id="add-role"
                  value={addingRoleId}
                  onChange={(e) => {
                    setAddingRoleId(e.target.value);
                    const r = catalog.find((r) => r.id === e.target.value);
                    if (r?.category === "VOICE") setAddingExclusive(false);
                  }}
                >
                  <option value="">Select role…</option>
                  {availableRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.defaultName}</SelectItem>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-min">Min</Label>
                <Input
                  id="add-min"
                  type="number"
                  min={0}
                  value={addingMin}
                  onChange={(e) => setAddingMin(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-max">Max (blank = ∞)</Label>
                <Input
                  id="add-max"
                  type="number"
                  min={1}
                  value={addingMax}
                  onChange={(e) => setAddingMax(e.target.value)}
                  placeholder="∞"
                />
              </div>
            </div>
            {!addingIsVoice && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={addingExclusive}
                  onChange={(e) => setAddingExclusive(e.target.checked)}
                  className="rounded border-input"
                />
                Exclusive (member can only fill this one role on the service)
              </label>
            )}
            {addingIsVoice && (
              <p className="text-xs text-muted-foreground">Voice part slots are never exclusive.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={addSlot} disabled={!addingRoleId}>Add slot</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAddSlot(false); setAddingRoleId(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddSlot(true)}>
            + Add slot
          </Button>
        )}
      </section>
    </div>
  );
}
