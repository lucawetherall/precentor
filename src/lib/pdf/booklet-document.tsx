import React from "react";
import { Document, Page } from "@react-pdf/renderer";
import type { BookletServiceSheetData } from "@/types/service-sheet";
import { createStyles } from "./create-styles";
import { accentColour } from "./theme";
import { resolveTemplate } from "./resolve-template";
import { SheetHeader } from "./components/sheet-header";
import { SheetFooter } from "./components/sheet-footer";
import { LiturgicalSectionView } from "./components/liturgical-section";

export function BookletDocument({
  data,
}: {
  data: BookletServiceSheetData;
}) {
  const styles = createStyles(data.templateLayout);
  const accent = accentColour(
    data.colour,
    data.templateLayout.accentColourOverride
  );
  const resolved = resolveTemplate(data);
  const pageSize = data.templateLayout.paperSize;

  return (
    <Document>
      <Page size={pageSize} style={styles.page} wrap>
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

        {resolved.map((rs, i) => (
          <LiturgicalSectionView
            key={rs.section.id || i}
            resolved={rs}
            accent={accent}
            layout={data.templateLayout}
            includeReadingText={data.includeReadingText}
            styles={styles}
          />
        ))}

        <SheetFooter
          layout={data.templateLayout}
          ccliNumber={data.ccliNumber}
          styles={styles}
        />
      </Page>
    </Document>
  );
}

/** Render multiple booklet services into a single multi-page PDF */
export function MultiBookletDocument({
  sheets,
}: {
  sheets: BookletServiceSheetData[];
}) {
  return (
    <Document>
      {sheets.map((data, idx) => {
        const styles = createStyles(data.templateLayout);
        const accent = accentColour(
          data.colour,
          data.templateLayout.accentColourOverride
        );
        const resolved = resolveTemplate(data);
        const pageSize = data.templateLayout.paperSize;

        return (
          <Page key={idx} size={pageSize} style={styles.page} wrap>
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

            {resolved.map((rs, i) => (
              <LiturgicalSectionView
                key={rs.section.id || i}
                resolved={rs}
                accent={accent}
                layout={data.templateLayout}
                includeReadingText={data.includeReadingText}
                styles={styles}
              />
            ))}

            <SheetFooter
              layout={data.templateLayout}
              ccliNumber={data.ccliNumber}
              styles={styles}
            />
          </Page>
        );
      })}
    </Document>
  );
}
