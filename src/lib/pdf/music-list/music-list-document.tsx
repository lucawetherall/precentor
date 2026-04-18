import { Document, Page, View } from "@react-pdf/renderer";
import type { MusicListData } from "@/types/music-list";
import { registerMusicListFonts } from "./fonts";
import { createMusicListStyles } from "./styles";
import { Masthead } from "./components/masthead";
import { MonthDivider } from "./components/month-divider";
import { ServiceEntry } from "./components/service-entry";

interface MusicListDocumentProps {
  data: MusicListData;
}

export function MusicListDocument({ data }: MusicListDocumentProps) {
  // Idempotent; safe to call every render.
  registerMusicListFonts();

  const styles = createMusicListStyles();

  return (
    <Document
      title={`Music List — ${data.periodSubtitle}`}
      author={data.churchName}
    >
      <Page size="A4" style={styles.page}>
        <Masthead
          churchName={data.churchName}
          periodSubtitle={data.periodSubtitle}
          styles={styles}
        />

        {data.months.map((month, monthIdx) => {
          const [firstService, ...restServices] = month.services;
          const monthKey = `${month.year}-${month.monthName}-${monthIdx}`;

          return (
            <View key={monthKey}>
              {/* Pin the month divider to its first service so a divider
                  never orphans at the bottom of a page. */}
              <View wrap={false} minPresenceAhead={60}>
                <MonthDivider monthName={month.monthName} styles={styles} />
                {firstService ? (
                  <ServiceEntry
                    service={firstService}
                    isFirst
                    styles={styles}
                  />
                ) : null}
              </View>

              {restServices.map((service) => (
                <ServiceEntry
                  key={service.id}
                  service={service}
                  styles={styles}
                />
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
