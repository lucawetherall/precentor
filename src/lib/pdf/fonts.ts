// Font family mappings for @react-pdf/renderer

export interface FontSet {
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
}

/** Available font families mapped to react-pdf built-in fonts */
export const FONT_FAMILIES: Record<string, FontSet> = {
  times: {
    regular: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    boldItalic: "Times-BoldItalic",
  },
  // Garamond not available as built-in; falls back to Times
  garamond: {
    regular: "Times-Roman",
    bold: "Times-Bold",
    italic: "Times-Italic",
    boldItalic: "Times-BoldItalic",
  },
};

/** Get font set for a family name, defaulting to times */
export function getFontSet(family: string): FontSet {
  return FONT_FAMILIES[family] ?? FONT_FAMILIES.times;
}
