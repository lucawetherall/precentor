import { describe, it, expect } from 'vitest'
import { computeSeasonSegments, type RibbonDayInput } from '../lib/calendar-season-ribbon'

function day(date: string, season: RibbonDayInput['season']): RibbonDayInput {
  return { date, season }
}

describe('computeSeasonSegments', () => {
  it('returns an empty array when no days are given', () => {
    expect(computeSeasonSegments([])).toEqual([])
  })

  it('returns a single segment when all days share one season', () => {
    const days = [
      day('2026-07-05', 'ORDINARY'),
      day('2026-07-06', 'ORDINARY'),
      day('2026-07-07', 'ORDINARY'),
    ]
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ORDINARY', days: 3 },
    ])
  })

  it('collapses contiguous runs of the same season into one segment', () => {
    const days = [
      day('2026-11-29', 'ADVENT'),
      day('2026-11-30', 'ADVENT'),
      day('2026-12-01', 'ADVENT'),
      day('2026-12-24', 'ADVENT'),
      day('2026-12-25', 'CHRISTMAS'),
      day('2026-12-26', 'CHRISTMAS'),
    ]
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ADVENT', days: 4 },
      { season: 'CHRISTMAS', days: 2 },
    ])
  })

  it('produces three segments for A → B → A sequences', () => {
    const days = [
      day('2026-12-20', 'ADVENT'),
      day('2026-12-21', 'ADVENT'),
      day('2026-12-25', 'CHRISTMAS'),
      day('2026-12-28', 'ORDINARY'),
      day('2026-12-29', 'ORDINARY'),
    ]
    expect(computeSeasonSegments(days)).toEqual([
      { season: 'ADVENT', days: 2 },
      { season: 'CHRISTMAS', days: 1 },
      { season: 'ORDINARY', days: 2 },
    ])
  })

  it('preserves chronological order from the input', () => {
    const days = [
      day('2026-02-15', 'ORDINARY'),
      day('2026-02-16', 'ORDINARY'),
      day('2026-02-17', 'ORDINARY'),
      day('2026-02-18', 'LENT'),
      day('2026-02-19', 'LENT'),
    ]
    const segments = computeSeasonSegments(days)
    expect(segments.map((s) => s.season)).toEqual(['ORDINARY', 'LENT'])
    expect(segments[0].days + segments[1].days).toBe(5)
  })
})
