import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { SummaryServiceSheetData } from "@/types/service-sheet";
import { createStyles } from "./create-styles";
import { accentColour } from "./theme";
import { SheetHeader } from "./components/sheet-header";
import { SheetFooter } from "./components/sheet-footer";
import { MusicSlotRow } from "./components/music-slot-row";

const POSITION_LABELS: Record<string, string> = {
  OLD_TESTAMENT: "Old Testament",
  PSALM: "Psalm",
  EPISTLE: "Epistle",
  GOSPEL: "Gospel",
  CANTICLE: "Canticle",
};

export function SummaryDocument({
  data,
}: {
  data: SummaryServiceSheetData;
}) {
  const styles = createStyles(data.templateLayout);
  const accent = accentColour(
    data.colour,
    data.templateLayout.accentColourOverride
  );
  const pageSize = data.templateLayout.paperSize;

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        <SheetHeader
          churchName={data.churchName}
          serviceType={data.serviceType}
          liturgicalName={data.liturgicalName}
          date={data.date}
          time={data.time}
          season={data.season}
          colour={data.colour}
          logoUrl={data.logoUrl}
          layout={data.templateLayout}
          styles={styles}
        />

        {data.collect && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { borderBottomWidth: 0.5, borderBottomColor: accent },
              ]}
            >
              Collect
            </Text>
            <Text style={styles.collectText}>{data.collect}</Text>
          </View>
        )}

        {data.readings.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { borderBottomWidth: 0.5, borderBottomColor: accent },
              ]}
            >
              Readings
            </Text>
            {data.readings.map((r, i) => (
              <View key={i} style={styles.readingRow}>
                <Text style={styles.readingLabel}>
                  {POSITION_LABELS[r.position] || r.position}
                </Text>
                <Text style={styles.readingValue}>{r.reference}</Text>
              </View>
            ))}
          </View>
        )}

        {data.musicSlots.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { borderBottomWidth: 0.5, borderBottomColor: accent },
              ]}
            >
              Music
            </Text>
            {data.musicSlots.map((slot, i) => (
              <MusicSlotRow
                key={i}
                slot={slot}
                layout={data.templateLayout}
                styles={styles}
              />
            ))}
          </View>
        )}

        <SheetFooter layout={data.templateLayout} styles={styles} />
      </Page>
    </Document>
  );
}

/** Render multiple summary services into a single multi-page PDF */
export function MultiSummaryDocument({
  sheets,
}: {
  sheets: SummaryServiceSheetData[];
}) {
  return (
    <Document>
      {sheets.map((data, idx) => {
        const styles = createStyles(data.templateLayout);
        const accent = accentColour(
          data.colour,
          data.templateLayout.accentColourOverride
        );
        const pageSize = data.templateLayout.paperSize;

        return (
          <Page key={idx} size={pageSize} style={styles.page}>
            <SheetHeader
              churchName={data.churchName}
              serviceType={data.serviceType}
              liturgicalName={data.liturgicalName}
              date={data.date}
              time={data.time}
              season={data.season}
              colour={data.colour}
              logoUrl={data.logoUrl}
              layout={data.templateLayout}
              styles={styles}
            />

            {data.collect && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { borderBottomWidth: 0.5, borderBottomColor: accent },
                  ]}
                >
                  Collect
                </Text>
                <Text style={styles.collectText}>{data.collect}</Text>
              </View>
            )}

            {data.readings.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { borderBottomWidth: 0.5, borderBottomColor: accent },
                  ]}
                >
                  Readings
                </Text>
                {data.readings.map((r, i) => (
                  <View key={i} style={styles.readingRow}>
                    <Text style={styles.readingLabel}>
                      {POSITION_LABELS[r.position] || r.position}
                    </Text>
                    <Text style={styles.readingValue}>{r.reference}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.musicSlots.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { borderBottomWidth: 0.5, borderBottomColor: accent },
                  ]}
                >
                  Music
                </Text>
                {data.musicSlots.map((slot, i) => (
                  <MusicSlotRow
                    key={i}
                    slot={slot}
                    layout={data.templateLayout}
                    styles={styles}
                  />
                ))}
              </View>
            )}

            <SheetFooter layout={data.templateLayout} styles={styles} />
          </Page>
        );
      })}
    </Document>
  );
}
