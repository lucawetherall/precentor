// PDF colour theme constants

/** Map liturgical colour names (uppercase) to hex values for PDF accents */
const COLOUR_HEX_RAW: Record<string, string> = {
  PURPLE: "#5B2C6F",
  WHITE: "#8B7D6B",
  GOLD: "#D4AF37",
  GREEN: "#4A6741",
  RED: "#8B2500",
  ROSE: "#C48A9F",
};

/** Default fallback accent colour (warm stone) */
export const DEFAULT_ACCENT = "#D4C5B2";

/** Resolve liturgical colour to hex, with optional override. Case-insensitive. */
export function accentColour(colour: string, override?: string): string {
  if (override) return override;
  return COLOUR_HEX_RAW[colour.toUpperCase()] ?? DEFAULT_ACCENT;
}

// Semantic colour tokens
export const TEXT_PRIMARY = "#2C2416";
export const TEXT_MUTED = "#6B5D4D";
export const BORDER_LIGHT = "#D4C5B2";

/** Map liturgical colour names to DOCX hex (no #). Case-insensitive. */
const COLOUR_HEX_DOCX_RAW: Record<string, string> = {
  PURPLE: "5B2C6F",
  WHITE: "8B7D6B",
  GOLD: "D4AF37",
  GREEN: "4A6741",
  RED: "8B2500",
  ROSE: "C48A9F",
};

export function accentColourDocx(colour: string, override?: string): string {
  if (override) return override.replace("#", "");
  return COLOUR_HEX_DOCX_RAW[colour.toUpperCase()] ?? "D4C5B2";
}
