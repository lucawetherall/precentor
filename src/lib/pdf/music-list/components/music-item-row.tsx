import { Text, View } from "@react-pdf/renderer";
import type { MusicItemRow as MusicItemRowData } from "@/types/music-list";
import { createMusicListStyles } from "../styles";

interface MusicItemRowProps {
  item: MusicItemRowData;
  styles: ReturnType<typeof createMusicListStyles>;
}

export function MusicItemRow({ item, styles }: MusicItemRowProps) {
  // Strip trailing linebreak segments — they'd render as an orphan blank line
  // before `sub` (or after the visible content when `sub` is absent).
  let segments = item.segments;
  while (
    segments.length > 0 &&
    segments[segments.length - 1].kind === "linebreak"
  ) {
    segments = segments.slice(0, -1);
  }

  return (
    <View style={styles.musicRow}>
      <Text style={styles.musicLabel}>{item.label}</Text>
      <Text style={styles.musicValue}>
        {segments.map((seg, i) => {
          switch (seg.kind) {
            case "plain":
              return <Text key={i}>{seg.text}</Text>;
            case "italic":
              return (
                <Text key={i} style={styles.italic}>
                  {seg.text}
                </Text>
              );
            case "linebreak":
              return <Text key={i}>{"\n"}</Text>;
            default: {
              const _exhaustive: never = seg;
              throw new Error(
                `Unknown music-item segment kind: ${JSON.stringify(_exhaustive)}`,
              );
            }
          }
        })}
        {item.sub ? (
          <>
            <Text>{" "}</Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </>
        ) : null}
      </Text>
    </View>
  );
}
