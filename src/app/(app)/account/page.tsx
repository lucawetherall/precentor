"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountPage() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "precentor-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — browser shows no download
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Type DELETE (in capitals) to confirm.");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      router.push("/login");
    } catch {
      setDeleteError("Could not delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-semibold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal data in accordance with your rights under UK data protection law.
        </p>
      </div>

      <section className="space-y-4 border border-border rounded p-6">
        <div className="space-y-1">
          <h2 className="text-base font-heading font-medium">Export your data</h2>
          <p className="text-sm text-muted-foreground">
            Download a copy of all personal data Precentor holds about you (GDPR Article 20 — Right to data portability).
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing export..." : "Download my data"}
        </Button>
      </section>

      <section className="space-y-4 border border-destructive/30 rounded p-6">
        <div className="space-y-1">
          <h2 className="text-base font-heading font-medium text-destructive">Delete account</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This cannot be undone
            (GDPR Article 17 — Right to erasure).
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="delete-confirm" className="text-sm font-body">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </label>
          <Input
            id="delete-confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="max-w-xs bg-white"
          />
        </div>
        {deleteError && (
          <p role="alert" className="text-sm text-destructive">{deleteError}</p>
        )}
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting account..." : "Delete my account"}
        </Button>
      </section>

      <p className="text-xs text-muted-foreground">
        For more information, see our{" "}
        <a href="/privacy" className="underline hover:no-underline">Privacy Notice</a>.
      </p>
    </main>
  );
}
