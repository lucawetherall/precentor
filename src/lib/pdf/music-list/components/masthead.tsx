import { Text, View } from "@react-pdf/renderer";
import { createMusicListStyles } from "../styles";

interface MastheadProps {
  churchName: string;
  periodSubtitle: string;
  styles: ReturnType<typeof createMusicListStyles>;
}

export function Masthead({ churchName, periodSubtitle, styles }: MastheadProps) {
  return (
    <View style={styles.masthead}>
      <Text style={styles.churchName}>{churchName}</Text>
      <Text style={styles.docTitle}>Music List</Text>
      <Text style={styles.docPeriod}>{periodSubtitle}</Text>
    </View>
  );
}
