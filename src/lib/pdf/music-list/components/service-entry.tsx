import { Text, View } from "@react-pdf/renderer";
import type { MusicListService } from "@/types/music-list";
import { formatOrdinalParts } from "../ordinal";
import { createMusicListStyles } from "../styles";
import { MusicItemRow } from "./music-item-row";

interface ServiceEntryProps {
  service: MusicListService;
  isFirst?: boolean;
  styles: ReturnType<typeof createMusicListStyles>;
}

/** Filter music items according to the preset's field-set. */
function filterItems(service: MusicListService) {
  const { items, musicListFieldSet } = service;
  if (musicListFieldSet === "HYMNS_ONLY") {
    return items.filter((item) => item.label === "Hymns");
  }
  if (musicListFieldSet === "READINGS_ONLY") {
    return [];
  }
  // "CHORAL" (default) — show everything
  return items;
}

export function ServiceEntry({ service, isFirst, styles }: ServiceEntryProps) {
  const { dayName, dayNum, ordinal, month } = formatOrdinalParts(service.date);
  const visibleItems = filterItems(service);

  return (
    <View
      wrap={false}
      style={isFirst ? [styles.service, styles.serviceFirst] : styles.service}
    >
      <View style={styles.serviceDateColumn}>
        <Text style={styles.serviceDate}>
          {`${dayName} ${dayNum}`}
          <Text style={styles.ordinalSup}>{ordinal}</Text>
          {` ${month}`}
        </Text>
        {service.time ? (
          <Text style={styles.serviceTime}>{service.time}</Text>
        ) : null}
      </View>

      <View style={styles.serviceBody}>
        {service.feastName ? (
          <Text style={styles.serviceFeast}>{service.feastName}</Text>
        ) : null}

        <Text
          style={
            service.isSaid
              ? [styles.serviceType, styles.serviceTypeSaid]
              : styles.serviceType
          }
        >
          {service.serviceTypeLabel}
        </Text>

        {service.isSaid ? (
          service.saidNote ? (
            <Text style={styles.saidNote}>{service.saidNote}</Text>
          ) : null
        ) : (
          visibleItems.map((item, i) => (
            <MusicItemRow key={i} item={item} styles={styles} />
          ))
        )}
      </View>
    </View>
  );
}
