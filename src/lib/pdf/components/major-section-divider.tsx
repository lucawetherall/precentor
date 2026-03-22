import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { PdfStyles } from "../create-styles";

interface MajorSectionDividerProps {
  title: string;
  accent: string;
  styles: PdfStyles;
}

export function MajorSectionDivider({
  title,
  accent,
  styles,
}: MajorSectionDividerProps) {
  return (
    <View
      style={[
        styles.majorSectionDivider,
        { borderTopColor: accent, borderBottomColor: accent },
      ]}
    >
      <Text style={[styles.majorSectionTitle, { color: accent }]}>
        {title}
      </Text>
    </View>
  );
}
