import React from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import type { TemplateLayout } from "@/types/service-sheet";
import type { PdfStyles } from "../create-styles";
import { accentColour } from "../theme";
import { SERVICE_TYPE_DISPLAY } from "../service-sheet";

interface SheetHeaderProps {
  churchName: string;
  serviceType: string;
  liturgicalName: string;
  date: string;
  time?: string;
  season: string;
  colour: string;
  logoUrl?: string;
  layout: TemplateLayout;
  styles: PdfStyles;
}

export function SheetHeader({
  churchName,
  serviceType,
  liturgicalName,
  date,
  time,
  season,
  colour,
  logoUrl,
  layout,
  styles,
}: SheetHeaderProps) {
  const accent = accentColour(colour, layout.accentColourOverride);

  return (
    <View style={styles.header}>
      {layout.showLogo && logoUrl && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={logoUrl}
          style={{
            width: 60,
            height: 60,
            marginBottom: 8,
            ...(layout.logoPosition === "top-center"
              ? { marginLeft: "auto", marginRight: "auto" }
              : {}),
          }}
        />
      )}
      <Text style={styles.churchName}>{churchName}</Text>
      <Text style={styles.serviceTitle}>
        {SERVICE_TYPE_DISPLAY[serviceType] || serviceType}
      </Text>
      <Text style={styles.dateText}>{liturgicalName}</Text>
      <Text style={styles.dateText}>
        {date}
        {time ? ` at ${time}` : ""}
      </Text>
      <Text style={styles.seasonBadge}>
        {season} — {colour}
      </Text>
      {layout.borderStyle === "stripe" && (
        <View style={[styles.colourStripe, { backgroundColor: accent }]} />
      )}
    </View>
  );
}
