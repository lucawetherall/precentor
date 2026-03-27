import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { PdfStyles } from "../create-styles";
import type { TemplateLayout } from "@/types/service-sheet";
import type { ResolvedDbSection } from "@/types/service-sheet";
import { TextBlockView } from "./text-block";
import { ReadingBlock } from "./reading-block";
import { MusicSlotRow } from "./music-slot-row";
import { MajorSectionDivider } from "./major-section-divider";

interface DbSectionViewProps {
  section: ResolvedDbSection;
  accent: string;
  layout: TemplateLayout;
  includeReadingText: boolean;
  styles: PdfStyles;
}

export function DbSectionView({
  section,
  accent,
  layout,
  includeReadingText,
  styles,
}: DbSectionViewProps) {
  return (
    <View style={styles.section} wrap={false}>
      {section.majorSection && (
        <MajorSectionDivider
          title={section.majorSection}
          accent={accent}
          styles={styles}
        />
      )}

      {section.title && (
        <Text
          style={[
            styles.sectionTitle,
            { borderBottomWidth: 0.5, borderBottomColor: accent },
          ]}
        >
          {section.title}
        </Text>
      )}

      {section.blocks.map((block, i) => (
        <TextBlockView key={i} block={block} styles={styles} />
      ))}

      {section.reading && (
        <ReadingBlock
          reading={section.reading}
          includeText={includeReadingText}
          styles={styles}
        />
      )}

      {section.musicSlot && (
        <MusicSlotRow slot={section.musicSlot} layout={layout} styles={styles} />
      )}
    </View>
  );
}
