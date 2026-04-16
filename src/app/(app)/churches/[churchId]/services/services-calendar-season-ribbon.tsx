import type { LiturgicalDayWithService } from '@/types/service-views'
import type { LiturgicalSeason } from '@/types'
import { computeSeasonSegments } from './lib/calendar-season-ribbon'

interface Props {
  days: LiturgicalDayWithService[]
}

const SEASON_LABELS: Record<LiturgicalSeason, string> = {
  ADVENT: 'Advent',
  CHRISTMAS: 'Christmas',
  EPIPHANY: 'Epiphany',
  LENT: 'Lent',
  HOLY_WEEK: 'Holy Week',
  EASTER: 'Easter',
  ASCENSION: 'Ascension',
  PENTECOST: 'Pentecost',
  TRINITY: 'Trinity',
  ORDINARY: 'Ordinary Time',
  KINGDOM: 'Kingdom',
}

const SEASON_BG: Record<LiturgicalSeason, string> = {
  ADVENT: 'var(--color-liturgical-purple)',
  CHRISTMAS: 'var(--color-liturgical-gold)',
  EPIPHANY: 'var(--color-liturgical-white)',
  LENT: 'var(--color-liturgical-purple)',
  HOLY_WEEK: 'var(--color-liturgical-red)',
  EASTER: 'var(--color-liturgical-gold)',
  ASCENSION: 'var(--color-liturgical-gold)',
  PENTECOST: 'var(--color-liturgical-red)',
  TRINITY: 'var(--color-liturgical-green)',
  ORDINARY: 'var(--color-liturgical-green)',
  KINGDOM: 'var(--color-liturgical-red)',
}

const LIGHT_SEASONS: ReadonlySet<LiturgicalSeason> = new Set(['EPIPHANY', 'CHRISTMAS'])

export function ServicesCalendarSeasonRibbon({ days }: Props) {
  const segments = computeSeasonSegments(days)
  if (segments.length === 0) return null

  return (
    <div
      aria-hidden="true"
      className="flex w-full overflow-hidden rounded-sm border border-border my-3"
      style={{ height: '22px' }}
    >
      {segments.map((seg, i) => {
        const bg = SEASON_BG[seg.season]
        const light = LIGHT_SEASONS.has(seg.season)
        return (
          <div
            key={`${seg.season}-${i}`}
            className="flex items-center justify-center overflow-hidden px-2 small-caps text-[10px] whitespace-nowrap"
            style={{
              flex: seg.days,
              background: bg,
              color: light ? 'var(--foreground)' : '#fff',
            }}
          >
            {SEASON_LABELS[seg.season]}
          </div>
        )
      })}
    </div>
  )
}
