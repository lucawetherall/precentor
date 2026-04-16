"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Church {
  id: string;
  name: string;
  diocese: string | null;
  address: string | null;
  ccliNumber: string | null;
}

type FieldErrors = Partial<Record<"name" | "diocese" | "address" | "ccliNumber", string>>;

export function ChurchSettingsForm({ church }: { church: Church }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/churches/${church.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        diocese: formData.get("diocese"),
        address: formData.get("address"),
        ccliNumber: formData.get("ccliNumber"),
      }),
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
