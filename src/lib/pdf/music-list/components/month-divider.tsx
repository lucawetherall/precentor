import { Text, View } from "@react-pdf/renderer";
import { createMusicListStyles } from "../styles";

interface MonthDividerProps {
  monthName: string;
  styles: ReturnType<typeof createMusicListStyles>;
}

export function MonthDivider({ monthName, styles }: MonthDividerProps) {
  return (
    <View style={styles.monthDividerRow}>
      <View style={styles.monthRule} />
      <View style={styles.monthDiamond} />
      <Text style={styles.monthName}>{monthName}</Text>
      <View style={styles.monthDiamond} />
      <View style={styles.monthRule} />
    </View>
  );
}
