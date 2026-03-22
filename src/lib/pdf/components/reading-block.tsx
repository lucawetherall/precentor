import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { ReadingEntry } from "@/types/service-sheet";
import type { PdfStyles } from "../create-styles";

const POSITION_LABELS: Record<string, string> = {
  OLD_TESTAMENT: "Old Testament",
  PSALM: "Psalm",
  EPISTLE: "Epistle",
  GOSPEL: "Gospel",
  CANTICLE: "Canticle",
};

interface ReadingBlockProps {
  reading: ReadingEntry;
  includeText: boolean;
  styles: PdfStyles;
}

export function ReadingBlock({
  reading,
  includeText,
  styles,
}: ReadingBlockProps) {
  const label = POSITION_LABELS[reading.position] || reading.position;

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={styles.readingRow}>
        <Text style={styles.readingLabel}>{label}</Text>
        <Text style={styles.readingValue}>{reading.reference}</Text>
      </View>
      {includeText && reading.text && (
        <Text style={styles.readingText}>{reading.text}</Text>
      )}
    </View>
  );
}
