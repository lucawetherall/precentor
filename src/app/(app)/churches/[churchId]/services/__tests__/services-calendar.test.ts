import { describe, it, expect } from 'vitest'
import { buildMonthGrid, pickDaysForGrid } from '../services-calendar'
import type { LiturgicalDayWithService } from '@/types/service-views'

describe('buildMonthGrid', () => {
  it('April 2026 starts Wednesday — prev-month fills Mon/Tue slots', () => {
    const grid = buildMonthGrid(2026, 3) // month=3 is April (0-indexed)
    expect(grid[0]).toBe('2026-03-30')   // Mon col: outside-month (March 30)
    expect(grid[1]).toBe('2026-03-31')   // Tue col: outside-month (March 31)
    expect(grid[2]).toBe('2026-04-01')   // Wed col: April 1
    expect(grid[6]).toBe('2026-04-05')   // Sun col: first Sunday (Palm Sunday)
  })

  it('always produces exactly 42 cells (6 rows × 7 cols)', () => {
    for (let m = 0; m < 12; m++) {
      expect(buildMonthGrid(2026, m).length).toBe(42)
    }
  })

  it('January 2026 starts Thursday — prev-month fills Mon/Tue/Wed', () => {
    const grid = buildMonthGrid(2026, 0)
    expect(grid[0]).toBe('2025-12-29')   // Mon
    expect(grid[1]).toBe('2025-12-30')   // Tue
    expect(grid[2]).toBe('2025-12-31')   // Wed
    expect(grid[3]).toBe('2026-01-01')   // Thu
  })

  it('contains the correct number of in-month days', () => {
    const april = buildMonthGrid(2026, 3).filter((d) => d.startsWith('2026-04-'))
    expect(april).toHaveLength(30)
    const feb = buildMonthGrid(2026, 1).filter((d) => d.startsWith('2026-02-'))
    expect(feb).toHaveLength(28)
  })
})

function day(date: string): LiturgicalDayWithService {
  return {
    id: `id-${date}`,
    date,
    cwName: 'Test Day',
    season: 'ORDINARY',
    colour: 'GREEN',
    collect: null,
    services: [],
  }
}

describe('pickDaysForGrid', () => {
  it('returns only days whose date string is present in the grid', () => {
    const all = [
      day('2026-04-01'),
      day('2026-04-05'),
      day('2026-04-30'),
      day('2026-05-01'), // 1 May 2026 is a Friday — IS in April's grid as an outside-month day
      day('2026-06-15'), // definitely outside
    ]
    const picked = pickDaysForGrid(all, 2026, 3) // April
    const dates = picked.map((d) => d.date)
    expect(dates).toContain('2026-04-01')
    expect(dates).toContain('2026-04-05')
    expect(dates).toContain('2026-04-30')
    expect(dates).toContain('2026-05-01')
    expect(dates).not.toContain('2026-06-15')
  })

  it('includes days from the previous month that appear in the grid', () => {
    // April 2026 grid starts Wed Apr 1, so Mon Mar 30 and Tue Mar 31 are outside days
    const all = [day('2026-03-30'), day('2026-03-31'), day('2026-04-01')]
    const picked = pickDaysForGrid(all, 2026, 3)
    expect(picked.map((d) => d.date).sort()).toEqual([
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
    ])
  })

  it('returns an empty array when no input days intersect the grid', () => {
    const all = [day('2027-01-01')]
    expect(pickDaysForGrid(all, 2026, 3)).toEqual([])
  })
})
