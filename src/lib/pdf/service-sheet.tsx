import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/** Map liturgical colour names to hex values for PDF accents */
const COLOUR_HEX: Record<string, string> = {
  PURPLE: "#5B2C6F",
  WHITE: "#8B7D6B",
  GOLD: "#D4AF37",
  GREEN: "#4A6741",
  RED: "#8B2500",
  ROSE: "#C48A9F",
  Purple: "#5B2C6F",
  White: "#8B7D6B",
  Gold: "#D4AF37",
  Green: "#4A6741",
  Red: "#8B2500",
  Rose: "#C48A9F",
};

function accentColour(colour: string): string {
  return COLOUR_HEX[colour] ?? "#D4C5B2";
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#2C2416",
    backgroundColor: "#FFFFFF",
  },
  pageA5: {
    padding: 30,
    fontFamily: "Times-Roman",
    fontSize: 10,
    color: "#2C2416",
    backgroundColor: "#FFFFFF",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    paddingBottom: 12,
  },
  churchName: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 18,
    fontFamily: "Times-Bold",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#6B5D4D",
    marginBottom: 2,
  },
  seasonBadge: {
    fontSize: 9,
    color: "#6B5D4D",
    marginTop: 4,
  },
  colourStripe: {
    height: 3,
    marginTop: 8,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    marginBottom: 6,
    paddingBottom: 3,
  },
  slotRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 8,
  },
  slotLabel: {
    width: 120,
    fontSize: 10,
    fontFamily: "Times-Bold",
  },
  slotValue: {
    flex: 1,
    fontSize: 10,
  },
  slotHymnNumber: {
    fontSize: 9,
    color: "#6B5D4D",
    fontFamily: "Times-Italic",
  },
  slotNotes: {
    fontSize: 9,
    color: "#6B5D4D",
    fontFamily: "Times-Italic",
  },
  readingRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 8,
  },
  readingLabel: {
    width: 80,
    fontSize: 10,
    fontFamily: "Times-Italic",
  },
  readingValue: {
    flex: 1,
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#6B5D4D",
    borderTopWidth: 0.5,
    borderTopColor: "#D4C5B2",
    paddingTop: 6,
  },
  collectText: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    paddingLeft: 8,
    marginBottom: 8,
    lineHeight: 1.4,
  },
});

export interface ServiceSheetData {
  churchName: string;
  serviceType: string;
  date: string;
  liturgicalName: string;
  season: string;
  colour: string;
  collect?: string;
  readings: { position: string; reference: string }[];
  musicSlots: {
    label: string;
    value: string;
    notes?: string;
    hymnNumber?: string;
  }[];
  format?: "A4" | "A5";
  logoUrl?: string;
}

export const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  SUNG_EUCHARIST: "Sung Eucharist",
  CHORAL_EVENSONG: "Choral Evensong",
  SAID_EUCHARIST: "Said Eucharist",
  CHORAL_MATINS: "Choral Matins",
  FAMILY_SERVICE: "Family Service",
  COMPLINE: "Compline",
  CUSTOM: "Service",
};

export function ServiceSheetDocument({ data }: { data: ServiceSheetData }) {
  const isA5 = data.format === "A5";
  const pageSize = isA5 ? "A5" : "A4";
  const pageStyle = isA5 ? styles.pageA5 : styles.page;
  const accent = accentColour(data.colour);

  return (
    <Document>
      <Page size={pageSize} style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.churchName}>{data.churchName}</Text>
          <Text style={styles.serviceTitle}>
            {SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType}
          </Text>
          <Text style={styles.dateText}>{data.liturgicalName}</Text>
          <Text style={styles.dateText}>{data.date}</Text>
          <Text style={styles.seasonBadge}>
            {data.season} — {data.colour}
          </Text>
          <View style={[styles.colourStripe, { backgroundColor: accent }]} />
        </View>

        {data.collect && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
              Collect
            </Text>
            <Text style={styles.collectText}>{data.collect}</Text>
          </View>
        )}

        {data.readings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
              Readings
            </Text>
            {data.readings.map((r, i) => (
              <View key={i} style={styles.readingRow}>
                <Text style={styles.readingLabel}>{r.position}</Text>
                <Text style={styles.readingValue}>{r.reference}</Text>
              </View>
            ))}
          </View>
        )}

        {data.musicSlots.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
              Music
            </Text>
            {data.musicSlots.map((slot, i) => (
              <View key={i} style={styles.slotRow}>
                <Text style={styles.slotLabel}>{slot.label}</Text>
                <Text style={styles.slotValue}>
                  {slot.value}
                  {slot.hymnNumber ? (
                    <Text style={styles.slotHymnNumber}>{` [${slot.hymnNumber}]`}</Text>
                  ) : null}
                  {slot.notes ? (
                    <Text style={styles.slotNotes}>{` (${slot.notes})`}</Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Generated by Precentor — Church Music Planner
        </Text>
      </Page>
    </Document>
  );
}

/** Render multiple services into a single multi-page PDF document */
export function MultiServiceSheetDocument({ sheets }: { sheets: ServiceSheetData[] }) {
  return (
    <Document>
      {sheets.map((data, idx) => {
        const isA5 = data.format === "A5";
        const pageSize = isA5 ? "A5" : "A4";
        const pageStyle = isA5 ? styles.pageA5 : styles.page;
        const accent = accentColour(data.colour);

        return (
          <Page key={idx} size={pageSize} style={pageStyle}>
            <View style={styles.header}>
              <Text style={styles.churchName}>{data.churchName}</Text>
              <Text style={styles.serviceTitle}>
                {SERVICE_TYPE_DISPLAY[data.serviceType] || data.serviceType}
              </Text>
              <Text style={styles.dateText}>{data.liturgicalName}</Text>
              <Text style={styles.dateText}>{data.date}</Text>
              <Text style={styles.seasonBadge}>
                {data.season} — {data.colour}
              </Text>
              <View style={[styles.colourStripe, { backgroundColor: accent }]} />
            </View>

            {data.collect && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
                  Collect
                </Text>
                <Text style={styles.collectText}>{data.collect}</Text>
              </View>
            )}

            {data.readings.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
                  Readings
                </Text>
                {data.readings.map((r, i) => (
                  <View key={i} style={styles.readingRow}>
                    <Text style={styles.readingLabel}>{r.position}</Text>
                    <Text style={styles.readingValue}>{r.reference}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.musicSlots.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { borderBottomWidth: 0.5, borderBottomColor: accent }]}>
                  Music
                </Text>
                {data.musicSlots.map((slot, i) => (
                  <View key={i} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotValue}>
                      {slot.value}
                      {slot.hymnNumber ? (
                        <Text style={styles.slotHymnNumber}>{` [${slot.hymnNumber}]`}</Text>
                      ) : null}
                      {slot.notes ? (
                        <Text style={styles.slotNotes}>{` (${slot.notes})`}</Text>
                      ) : null}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.footer}>
              Generated by Precentor — Church Music Planner
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}
