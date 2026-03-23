"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SERVICE_LABELS: Record<string, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
};

export default function NewChurchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedServices, setSelectedServices] = useState<
    Record<string, { enabled: boolean; time: string }>
  >({
    SUNG_EUCHARIST: { enabled: false, time: "10:00" },
    CHORAL_EVENSONG: { enabled: false, time: "18:30" },
    SAID_EUCHARIST: { enabled: false, time: "08:00" },
    CHORAL_MATINS: { enabled: false, time: "10:00" },
    FAMILY_SERVICE: { enabled: false, time: "09:30" },
    COMPLINE: { enabled: false, time: "21:00" },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim();

    if (!name) {
      setError("Church name is required.");
      setLoading(false);
      return;
    }

    const defaultServices = Object.entries(selectedServices)
      .filter(([, v]) => v.enabled)
      .map(([type, v]) => ({ type, time: v.time }));

    const res = await fetch("/api/churches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        diocese: formData.get("diocese"),
        address: formData.get("address"),
        ccliNumber: formData.get("ccliNumber"),
        defaultServices,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/churches/${data.id}/sundays`);
    } else {
      try {
        const data = await res.json();
        setError(data.error || "Failed to create church.");
      } catch {
        setError("Failed to create church.");
      }
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="p-8 max-w-lg">
      <h1 className="text-3xl font-heading font-semibold mb-6">Add Church</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-body">Church Name *</label>
          <input
            id="name"
            name="name"
            required
            autoComplete="organization"
            placeholder="St Mary's, Anytown"
            className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="diocese" className="text-sm font-body">Diocese</label>
          <input
            id="diocese"
            name="diocese"
            autoComplete="off"
            placeholder="Diocese of Oxford"
            className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="address" className="text-sm font-body">Address</label>
          <textarea
            id="address"
            name="address"
            rows={2}
            autoComplete="street-address"
            className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none resize-y"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ccliNumber" className="text-sm font-body">CCLI Number</label>
          <input
            id="ccliNumber"
            name="ccliNumber"
            autoComplete="off"
            inputMode="numeric"
            placeholder="123456"
            className="w-full px-3 py-2 text-sm border border-border bg-white focus:border-primary focus:outline-none"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-body font-semibold">Regular Services</legend>
          <p className="text-xs text-muted-foreground">
            Select the services your church holds each Sunday. These will be created
            automatically for every upcoming date.
          </p>
          {Object.entries(SERVICE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`svc-${type}`}
                checked={selectedServices[type].enabled}
                onChange={(e) =>
                  setSelectedServices((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], enabled: e.target.checked },
                  }))
                }
                className="accent-primary"
              />
              <label htmlFor={`svc-${type}`} className="text-sm flex-1">
                {label}
              </label>
              {selectedServices[type].enabled && (
                <input
                  type="time"
                  value={selectedServices[type].time}
                  onChange={(e) =>
                    setSelectedServices((prev) => ({
                      ...prev,
                      [type]: { ...prev[type], time: e.target.value },
                    }))
                  }
                  className="text-sm border border-border px-2 py-1 bg-white"
                />
              )}
            </div>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Church"}
        </button>
      </form>
    </main>
  );
}
