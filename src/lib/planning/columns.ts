export const COLUMN_ORDER = [
  "introit", "hymns", "setting", "psalm", "chant", "respAccl", "anthem", "voluntary", "info",
] as const;

export type GridColumn = (typeof COLUMN_ORDER)[number];
