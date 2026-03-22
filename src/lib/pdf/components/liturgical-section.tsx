import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { PdfStyles } from "../create-styles";
import type { TemplateLayout } from "@/types/service-sheet";
import type { ResolvedSection } from "../resolve-template";
import { TextBlockView } from "./text-block";
import { ReadingBlock } from "./reading-block";
import { MusicSlotRow } from "./music-slot-row";
import { MajorSectionDivider } from "./major-section-divider";

interface LiturgicalSectionViewProps {
  resolved: ResolvedSection;
  accent: string;
  layout: TemplateLayout;
  includeReadingText: boolean;
  styles: PdfStyles;
}

export function LiturgicalSectionView({
  resolved,
  accent,
  layout,
  includeReadingText,
  styles,
}: LiturgicalSectionViewProps) {
  const { section, resolvedBlocks, reading, musicSlot } = resolved;

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

      {resolvedBlocks.map((block, i) => (
        <TextBlockView key={i} block={block} styles={styles} />
      ))}

      {reading && (
        <ReadingBlock
          reading={reading}
          includeText={includeReadingText}
          styles={styles}
        />
      )}

      {musicSlot && (
        <MusicSlotRow slot={musicSlot} layout={layout} styles={styles} />
      )}
    </View>
  );
}
