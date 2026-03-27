// Dynamic StyleSheet factory for PDF generation

import { StyleSheet } from "@react-pdf/renderer";
import type { TemplateLayout } from "@/types/service-sheet";
import { getFontSet } from "./fonts";
import { TEXT_PRIMARY, TEXT_MUTED, BORDER_LIGHT } from "./theme";

export function createStyles(layout: TemplateLayout) {
  const fonts = getFontSet(layout.fontFamily);
  const isA5 = layout.paperSize === "A5";
  const baseFontSize = isA5 ? 10 : 11;
  const padding = isA5 ? 30 : 40;

  return StyleSheet.create({
    // ─── Page ────────────────────────────────────────────
    page: {
      padding,
      fontFamily: fonts.regular,
      fontSize: baseFontSize,
      color: TEXT_PRIMARY,
      backgroundColor: "#FFFFFF",
    },

    // ─── Header ──────────────────────────────────────────
    header: {
      textAlign: layout.headerStyle === "left-aligned" ? "left" : "center",
      marginBottom: 20,
      paddingBottom: 12,
    },
    churchName: {
      fontSize: baseFontSize + 3,
      fontFamily: fonts.bold,
      marginBottom: 4,
    },
    serviceTitle: {
      fontSize: baseFontSize + 7,
      fontFamily: fonts.bold,
      marginBottom: 4,
    },
    dateText: {
      fontSize: baseFontSize,
      color: TEXT_MUTED,
      marginBottom: 2,
    },
    seasonBadge: {
      fontSize: baseFontSize - 2,
      color: TEXT_MUTED,
      marginTop: 4,
    },
    colourStripe: {
      height: 3,
      marginTop: 8,
    },

    // ─── Sections ────────────────────────────────────────
    section: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: baseFontSize + 1,
      fontFamily: fonts.bold,
      marginBottom: 6,
      paddingBottom: 3,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },

    // ─── Major Section Divider ───────────────────────────
    majorSectionDivider: {
      marginTop: 16,
      marginBottom: 10,
      paddingTop: 6,
      paddingBottom: 6,
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      textAlign: "center",
    },
    majorSectionTitle: {
      fontSize: baseFontSize + 1,
      fontFamily: fonts.bold,
      letterSpacing: 1,
      textTransform: "uppercase" as const,
    },

    // ─── Text Blocks (liturgical content) ────────────────
    speakerLabel: {
      fontSize: baseFontSize - 1,
      fontFamily: fonts.italic,
      color: TEXT_MUTED,
      marginBottom: 1,
    },
    presidentText: {
      fontSize: baseFontSize,
      fontFamily: fonts.regular,
      marginBottom: 6,
      lineHeight: 1.4,
    },
    congregationalText: {
      fontSize: baseFontSize,
      fontFamily: fonts.bold,
      marginBottom: 6,
      lineHeight: 1.4,
    },
    rubricText: {
      fontSize: baseFontSize - 1,
      fontFamily: fonts.italic,
      color: TEXT_MUTED,
      marginBottom: 4,
      lineHeight: 1.3,
    },

    // ─── Music Slots ────────────────────────────────────
    slotRow: {
      flexDirection: "row" as const,
      marginBottom: 4,
      paddingLeft: 8,
    },
    slotLabel: {
      width: isA5 ? 100 : 120,
      fontSize: baseFontSize - 1,
      fontFamily: fonts.bold,
    },
    slotValue: {
      flex: 1,
      fontSize: baseFontSize - 1,
    },
    slotHymnNumber: {
      fontSize: baseFontSize - 2,
      color: TEXT_MUTED,
      fontFamily: fonts.italic,
    },
    slotNotes: {
      fontSize: baseFontSize - 2,
      color: TEXT_MUTED,
      fontFamily: fonts.italic,
    },

    // ─── Readings ───────────────────────────────────────
    readingRow: {
      flexDirection: "row" as const,
      marginBottom: 3,
      paddingLeft: 8,
    },
    readingLabel: {
      width: isA5 ? 70 : 80,
      fontSize: baseFontSize - 1,
      fontFamily: fonts.italic,
    },
    readingValue: {
      flex: 1,
      fontSize: baseFontSize - 1,
    },
    readingText: {
      fontSize: baseFontSize - 1,
      fontFamily: fonts.regular,
      paddingLeft: 16,
      marginBottom: 8,
      lineHeight: 1.6,
    },

    // ─── Collect ────────────────────────────────────────
    collectText: {
      fontSize: baseFontSize - 1,
      fontFamily: fonts.italic,
      paddingLeft: 8,
      marginBottom: 8,
      lineHeight: 1.4,
    },

    // ─── Footer ─────────────────────────────────────────
    footer: {
      position: "absolute" as const,
      bottom: padding - 10,
      left: padding,
      right: padding,
      textAlign: "center",
      fontSize: baseFontSize - 3,
      color: TEXT_MUTED,
      borderTopWidth: 0.5,
      borderTopColor: BORDER_LIGHT,
      paddingTop: 6,
    },
  });
}

export type PdfStyles = ReturnType<typeof createStyles>;
