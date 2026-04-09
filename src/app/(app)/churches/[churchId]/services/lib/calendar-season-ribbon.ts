import type { LiturgicalSeason } from '@/types'

export interface RibbonDayInput {
  date: string
  season: LiturgicalSeason
}

export interface SeasonSegment {
  season: LiturgicalSeason
  days: number
}

/**
 * Collapses an ordered list of liturgical days into a list of proportional
 * season segments. Contiguous days with the same season become one segment.
 *
 * Input is assumed to already be in chronological order.
 */
export function computeSeasonSegments(days: RibbonDayInput[]): SeasonSegment[] {
  if (days.length === 0) return []

  const segments: SeasonSegment[] = []
  let current: SeasonSegment = { season: days[0].season, days: 1 }

  for (let i = 1; i < days.length; i++) {
    const d = days[i]
    if (d.season === current.season) {
      current.days += 1
    } else {
      segments.push(current)
      current = { season: d.season, days: 1 }
    }
  }
  segments.push(current)
  return segments
}
