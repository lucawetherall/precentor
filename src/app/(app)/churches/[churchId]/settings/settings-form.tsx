"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SheetMusicLink } from "@/lib/churches/settings";

interface Church {
  id: string;
  name: string;
  diocese: string | null;
  address: string | null;
  ccliNumber: string | null;
  sheetMusicLink: SheetMusicLink | null;
}

type FieldErrors = Partial<
  Record<
    | "name"
    | "diocese"
    | "address"
    | "ccliNumber"
    | "sheetMusicLinkUrl"
    | "sheetMusicLinkLabel",
    string
  >
>;

export function ChurchSettingsForm({ church }: { church: Church }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [linkUrl, setLinkUrl] = useState(church.sheetMusicLink?.url ?? "");
  const [linkLabel, setLinkLabel] = useState(church.sheetMusicLink?.label ?? "");
  const [removingLink, setRemovingLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const urlRaw = String(formData.get("sheetMusicLinkUrl") ?? "").trim();
    const labelRaw = String(formData.get("sheetMusicLinkLabel") ?? "").trim();

    // Build the link payload:
    //   undefined → don't touch the stored value
    //   null      → clear the stored value
    //   object    → set/replace the stored value
    let sheetMusicLink: { url: string; label?: string } | null | undefined;
    if (urlRaw.length > 0) {
      sheetMusicLink = { url: urlRaw };
      if (labelRaw.length > 0) sheetMusicLink.label = labelRaw;
    } else if (church.sheetMusicLink) {
      // The field was emptied — explicitly clear the stored link.
      sheetMusicLink = null;
    } else {
      sheetMusicLink = undefined;
    }

    const payload: Record<string, unknown> = {
      name: formData.get("name"),
      diocese: formData.get("diocese"),
      address: formData.get("address"),
      ccliNumber: formData.get("ccliNumber"),
    };
    if (sheetMusicLink !== undefined) payload.sheetMusicLink = sheetMusicLink;

    const res = await fetch(`/api/churches/${church.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setMessage({ kind: "success", text: "Settings saved." });
      router.refresh();
    } else {
      let body: { error?: string; fieldErrors?: FieldErrors } = {};
      try {
        body = await res.json();
      } catch {
        // ignore; keep body empty so we fall through to the generic message
      }
      if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
        setFieldErrors(body.fieldErrors);
        setMessage({ kind: "error", text: "Please fix the errors below." });
      } else {
        setMessage({ kind: "error", text: body.error || "Failed to save. Please try again." });
      }
    }
    setLoading(false);
  };

  const handleRemoveLink = async () => {
    setRemovingLink(true);
    setMessage(null);
    setFieldErrors({});
    const res = await fetch(`/api/churches/${church.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheetMusicLink: null }),
    });
    if (res.ok) {
      setLinkUrl("");
      setLinkLabel("");
      setMessage({ kind: "success", text: "Sheet music link removed." });
      router.refresh();
    } else {
      setMessage({ kind: "error", text: "Failed to remove link. Please try again." });
    }
    setRemovingLink(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-body">Church Name</label>
        <Input
          id="name"
          name="name"
          defaultValue={church.name}
          required
          autoComplete="organization"
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="diocese" className="text-sm font-body">Diocese</label>
        <Input
          id="diocese"
          name="diocese"
          defaultValue={church.diocese || ""}
          autoComplete="off"
          aria-invalid={fieldErrors.diocese ? true : undefined}
          aria-describedby={fieldErrors.diocese ? "diocese-error" : undefined}
        />
        {fieldErrors.diocese && (
          <p id="diocese-error" className="text-xs text-destructive">{fieldErrors.diocese}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-body">Address</label>
        <textarea
          id="address"
          name="address"
          defaultValue={church.address || ""}
          rows={2}
          autoComplete="street-address"
          aria-invalid={fieldErrors.address ? true : undefined}
          aria-describedby={fieldErrors.address ? "address-error" : undefined}
          className="w-full rounded-md px-3 py-2 text-sm border border-input bg-transparent shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
        {fieldErrors.address && (
          <p id="address-error" className="text-xs text-destructive">{fieldErrors.address}</p>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor="ccliNumber" className="text-sm font-body">CCLI Number</label>
        <Input
          id="ccliNumber"
          name="ccliNumber"
          defaultValue={church.ccliNumber || ""}
          autoComplete="off"
          aria-invalid={fieldErrors.ccliNumber ? true : undefined}
          aria-describedby={fieldErrors.ccliNumber ? "ccliNumber-error" : undefined}
        />
        {fieldErrors.ccliNumber && (
          <p id="ccliNumber-error" className="text-xs text-destructive">{fieldErrors.ccliNumber}</p>
        )}
      </div>

      <fieldset className="space-y-3 border-t pt-4">
        <legend className="text-sm font-body font-semibold">Sheet music library link</legend>
        <p id="sheet-music-help" className="text-xs text-muted-foreground">
          Paste an https:// link to where your choir keeps its sheet music (e.g. Dropbox, Google Drive, OneDrive).
          It will appear as a button on the Repertoire page for your church members.
          Avoid links containing personal information such as email addresses.
        </p>
        <div className="space-y-1">
          <label htmlFor="sheetMusicLinkUrl" className="text-sm font-body">URL</label>
          <Input
            id="sheetMusicLinkUrl"
            name="sheetMusicLinkUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.dropbox.com/scl/fo/..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            maxLength={2048}
            aria-describedby={fieldErrors.sheetMusicLinkUrl ? "sheetMusicLinkUrl-error" : "sheet-music-help"}
            aria-invalid={fieldErrors.sheetMusicLinkUrl ? true : undefined}
          />
          {fieldErrors.sheetMusicLinkUrl && (
            <p id="sheetMusicLinkUrl-error" className="text-xs text-destructive">{fieldErrors.sheetMusicLinkUrl}</p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="sheetMusicLinkLabel" className="text-sm font-body">
            Button label <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="sheetMusicLinkLabel"
            name="sheetMusicLinkLabel"
            autoComplete="off"
            placeholder="Open sheet music library"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            maxLength={60}
            aria-invalid={fieldErrors.sheetMusicLinkLabel ? true : undefined}
            aria-describedby={fieldErrors.sheetMusicLinkLabel ? "sheetMusicLinkLabel-error" : undefined}
          />
          {fieldErrors.sheetMusicLinkLabel && (
            <p id="sheetMusicLinkLabel-error" className="text-xs text-destructive">{fieldErrors.sheetMusicLinkLabel}</p>
          )}
        </div>
        {church.sheetMusicLink && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveLink}
            disabled={removingLink || loading}
          >
            {removingLink ? "Removing..." : "Remove link"}
          </Button>
        )}
      </fieldset>

      {message && (
        <p role="alert" aria-live="polite" className={`text-sm ${message.kind === "success" ? "text-success" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}
