export const CHOIR_STATUS_LABELS: Record<string, string> = {
  CHOIR_REQUIRED: "Choir required",
  NO_CHOIR_NEEDED: "No choir needed",
  SAID_SERVICE_ONLY: "Said service only",
  NO_SERVICE: "No service",
}

export const CHOIR_STATUS_NOTES: Record<string, string> = {
  NO_CHOIR_NEEDED: "no choir",
  SAID_SERVICE_ONLY: "said mass",
  NO_SERVICE: "no service",
}

export const CHOIR_STATUS_PILL_CLASSES: Record<string, string> = {
  CHOIR_REQUIRED: "",  // visually inert
  NO_CHOIR_NEEDED: "bg-warning/15 text-warning-foreground border border-warning/30",
  SAID_SERVICE_ONLY: "bg-muted text-muted-foreground border border-border",
  NO_SERVICE: "bg-destructive/10 text-destructive border border-destructive/20",
}
