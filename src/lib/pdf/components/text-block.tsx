import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { LiturgicalTextBlock } from "@/data/liturgy/types";
import type { PdfStyles } from "../create-styles";

const SPEAKER_LABELS: Record<string, string> = {
  president: "President",
  all: "All",
  reader: "Reader",
  deacon: "Deacon",
};

interface TextBlockProps {
  block: LiturgicalTextBlock;
  styles: PdfStyles;
}

export function TextBlockView({ block, styles }: TextBlockProps) {
  if (block.speaker === "rubric") {
    return <Text style={styles.rubricText}>{block.text}</Text>;
  }

  const label = SPEAKER_LABELS[block.speaker];
  const textStyle =
    block.speaker === "all" ? styles.congregationalText : styles.presidentText;

  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={styles.speakerLabel}>{label}</Text>}
      <Text style={textStyle}>{block.text}</Text>
    </View>
  );
}
