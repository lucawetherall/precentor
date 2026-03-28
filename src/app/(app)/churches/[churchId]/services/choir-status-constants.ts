export const CHOIR_STATUS_LABELS: Record<string, string> = {
  CHOIR_REQUIRED: "Choir required",
  NO_CHOIR_NEEDED: "No choir needed",
  SAID_SERVICE_ONLY: "Said service only",
  NO_SERVICE: "No service",
}

export const CHOIR_STATUS_PILL_CLASSES: Record<string, string> = {
  CHOIR_REQUIRED: "",  // visually inert
  NO_CHOIR_NEEDED: "bg-amber-100 text-amber-800 border border-amber-200",
  SAID_SERVICE_ONLY: "bg-gray-100 text-gray-600 border border-gray-200",
  NO_SERVICE: "bg-red-50 text-red-700 border border-red-100",
}
