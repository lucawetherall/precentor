"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useServiceEditor } from "./service-editor-context";

interface Block {
  speaker: string;
  text: string;
}

interface EucharisticPrayer {
  id: string;
  key: string;
  name: string;
  rite: string;
  description: string;
  blocks: Block[];
}

function RiteBadge({ rite }: { rite: string }) {
  const label = rite === "BCP" ? "BCP" : rite === "CW" ? "CW" : rite;
  return (
    <Badge
      variant="outline"
      className="text-xs rounded-sm px-1.5 py-0 font-body"
    >
      {label}
    </Badge>
  );
}

function PrayerRow({
  prayer,
  isSelected,
  onSelect,
}: {
  prayer: EucharisticPrayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border border-border rounded-sm transition-colors ${
        isSelected ? "bg-accent border-primary" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Selection indicator */}
        <div className="flex-shrink-0 mt-0.5">
          {isSelected ? (
            <Check className="h-4 w-4 text-primary" strokeWidth={2} />
          ) : (
            <div className="h-4 w-4" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-heading font-semibold">
              {prayer.name}
            </span>
            <RiteBadge rite={prayer.rite} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {prayer.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-0.5"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse preview" : "Preview full text"}
            title={expanded ? "Collapse" : "Preview full text"}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
          <Button
            size="sm"
            variant={isSelected ? "outline" : "default"}
            className="rounded-sm text-xs h-7 px-2"
            onClick={() => onSelect(prayer.id)}
            disabled={isSelected}
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        </div>
      </div>

      {/* Full text preview */}
      {expanded && prayer.blocks && prayer.blocks.length > 0 && (
        <div className="px-3 pb-3 pt-0 border-t border-border space-y-2 mt-0">
          {prayer.blocks.map((block, i) => (
            <div key={i}>
              {block.speaker && (
                <span className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                  {block.speaker}
                </span>
              )}
              <p className="text-xs leading-relaxed font-body">{block.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EucharisticPrayerBrowser() {
  const { settings, updateSettings } = useServiceEditor();

  const [open, setOpen] = useState(false);
  const [prayers, setPrayers] = useState<EucharisticPrayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    settings.eucharisticPrayerId
  );

  useEffect(() => {
    if (!open) return;
    if (prayers.length > 0) return;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch("/api/eucharistic-prayers");
        const data = await r.json();
        if (Array.isArray(data)) setPrayers(data);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, prayers.length]);

  const handleSelect = async (prayerId: string) => {
    setSaving(true);
    try {
      await updateSettings({ eucharisticPrayerId: prayerId });
      setSelectedId(prayerId);
      setOpen(false);
    } catch {
      // silent
    }
    setSaving(false);
  };

  const currentPrayer = prayers.find((p) => p.id === selectedId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
        {currentPrayer ? currentPrayer.name : "Choose prayer..."}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-heading">Eucharistic Prayers</SheetTitle>
        </SheetHeader>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            Saving...
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-sm" />
            ))}
          </div>
        ) : prayers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No eucharistic prayers found.
          </p>
        ) : (
          <div className="space-y-2">
            {prayers.map((prayer) => (
              <PrayerRow
                key={prayer.id}
                prayer={prayer}
                isSelected={prayer.id === selectedId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
