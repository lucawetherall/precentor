// Shared colour tokens and StyleSheet for the Music List PDF.
//
// Sizes, colours, and letter-spacings are taken directly from the plan's
// styles table and mirror the HTML skill template at
// example-music-list.html. Changing any value here will shift the visual
// output — if you need to tweak the design, update the plan table first.

import { StyleSheet } from "@react-pdf/renderer";

export const MUSIC_LIST_COLOURS = {
  parchment: "#F0E9DC",
  choirStall: "#2A1708",
  cassockRed: "#7E1818",
  limestone: "#C8BFA9",
  limestoneSoft: "#DCD4BF",
  organPipe: "#5F544A",
  naveStone: "#9A8F7F",
} as const;

export function createMusicListStyles() {
  const c = MUSIC_LIST_COLOURS;

  return StyleSheet.create({
    // ── Page & masthead ────────────────────────────────────────────
    page: {
      backgroundColor: c.parchment,
      color: c.choirStall,
      fontFamily: "SourceSerif4",
      fontSize: 10.9,
      lineHeight: 1.6,
      paddingTop: 62,
      paddingBottom: 62,
      paddingLeft: 68,
      paddingRight: 68,
    },
    masthead: {
      alignItems: "center",
      marginBottom: 28,
    },
    churchName: {
      fontFamily: "CormorantGaramond",
      fontWeight: 500,
      fontSize: 9,
      color: c.organPipe,
      textTransform: "uppercase",
      letterSpacing: 3.8,
      marginBottom: 10,
    },
    docTitle: {
      fontFamily: "CormorantGaramond",
      fontWeight: 300,
      fontSize: 40,
      color: c.choirStall,
      lineHeight: 1.05,
      letterSpacing: 0.8,
      textAlign: "center",
    },
    docPeriod: {
      fontFamily: "CormorantGaramond",
      fontWeight: 400,
      fontStyle: "italic",
      fontSize: 15,
      color: c.organPipe,
      letterSpacing: 0.4,
      marginTop: 6,
      textAlign: "center",
    },

    // ── Month divider ──────────────────────────────────────────────
    monthDividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 18,
      marginBottom: 14,
    },
    monthRule: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      height: 1,
      backgroundColor: c.cassockRed,
    },
    monthDiamond: {
      width: 4,
      height: 4,
      backgroundColor: c.cassockRed,
      marginHorizontal: 10,
      transform: "rotate(45deg)",
    },
    monthName: {
      fontFamily: "CormorantGaramond",
      fontWeight: 500,
      fontSize: 10,
      color: c.cassockRed,
      textTransform: "uppercase",
      letterSpacing: 4,
    },

    // ── Service entry ──────────────────────────────────────────────
    service: {
      flexDirection: "row",
      paddingTop: 14,
      paddingBottom: 14,
      borderTopWidth: 0.5,
      borderTopColor: c.limestone,
    },
    serviceFirst: {
      // First service under a month divider drops its top border.
      borderTopWidth: 0,
      paddingTop: 4,
    },
    serviceDateColumn: {
      width: 113,
      paddingRight: 12,
    },
    serviceDate: {
      fontFamily: "CormorantGaramond",
      fontWeight: 600,
      fontSize: 13,
      color: c.choirStall,
      letterSpacing: 0.15,
    },
    ordinalSup: {
      fontFamily: "CormorantGaramond",
      fontWeight: 600,
      fontSize: 8,
      color: c.choirStall,
      top: -3,
    },
    serviceTime: {
      fontFamily: "CormorantGaramond",
      fontWeight: 500,
      fontStyle: "italic",
      fontSize: 10.2,
      color: c.organPipe,
      marginTop: 4,
      letterSpacing: 0.22,
    },
    serviceBody: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    },
    serviceFeast: {
      fontFamily: "SourceSerif4",
      fontStyle: "italic",
      fontSize: 10.5,
      color: c.organPipe,
      marginBottom: 4,
    },
    serviceType: {
      fontFamily: "CormorantGaramond",
      fontWeight: 600,
      fontSize: 8.6,
      color: c.cassockRed,
      textTransform: "uppercase",
      letterSpacing: 2.2,
      marginBottom: 6,
    },
    serviceTypeSaid: {
      color: c.organPipe,
    },
    saidNote: {
      fontFamily: "SourceSerif4",
      fontStyle: "italic",
      fontSize: 10.2,
      color: c.organPipe,
    },

    // ── Music item row ─────────────────────────────────────────────
    musicRow: {
      flexDirection: "row",
      marginBottom: 3,
    },
    musicLabel: {
      width: 72,
      fontFamily: "CormorantGaramond",
      fontWeight: 600,
      fontSize: 8.3,
      color: c.organPipe,
      textTransform: "uppercase",
      letterSpacing: 1.35,
      paddingTop: 2,
    },
    musicValue: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      fontFamily: "SourceSerif4",
      fontWeight: 400,
      fontSize: 10.9,
      color: c.choirStall,
      lineHeight: 1.45,
    },
    italic: {
      fontStyle: "italic",
    },
    sub: {
      fontFamily: "SourceSerif4",
      fontStyle: "italic",
      fontSize: 10.2,
      color: c.organPipe,
    },
  });
}

export type MusicListStyles = ReturnType<typeof createMusicListStyles>;
