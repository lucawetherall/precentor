import { describe, it, expect } from 'vitest'
import { buildMonthGrid, isHolyDay } from '../services-calendar'

describe('buildMonthGrid', () => {
  it('April 2026 starts Wednesday — 2 null cells before day 1', () => {
    const grid = buildMonthGrid(2026, 3) // month=3 is April (0-indexed)
    expect(grid[0]).toBeNull()           // Mon col: empty
    expect(grid[1]).toBeNull()           // Tue col: empty
    expect(grid[2]).toBe('2026-04-01')   // Wed col: April 1
    expect(grid[6]).toBe('2026-04-05')   // Sun col: first Sunday (Palm Sunday)
  })

  it('total cells is always a multiple of 7', () => {
    for (let m = 0; m < 12; m++) {
      expect(buildMonthGrid(2026, m).length % 7).toBe(0)
    }
  })

  it('January 2026 starts Thursday — 3 null cells before day 1', () => {
    const grid = buildMonthGrid(2026, 0)
    expect(grid[0]).toBeNull()           // Mon: empty
    expect(grid[1]).toBeNull()           // Tue: empty
    expect(grid[2]).toBeNull()           // Wed: empty
    expect(grid[3]).toBe('2026-01-01')   // Thu: Jan 1
  })

  it('contains the correct number of days in the month', () => {
    const april = buildMonthGrid(2026, 3).filter(Boolean)
    expect(april).toHaveLength(30)
    const feb = buildMonthGrid(2026, 1).filter(Boolean) // 2026 not leap
    expect(feb).toHaveLength(28)
  })
})

describe('isHolyDay', () => {
  it('returns true for Good Friday (HOLY_WEEK season, Friday)', () => {
    expect(isHolyDay('2026-04-10', 'HOLY_WEEK')).toBe(true)
  })

  it('returns false for Palm Sunday (HOLY_WEEK season, Sunday)', () => {
    expect(isHolyDay('2026-04-05', 'HOLY_WEEK')).toBe(false)
  })

  it('returns false for an ordinary Sunday (non HOLY_WEEK)', () => {
    expect(isHolyDay('2026-05-03', 'EASTER')).toBe(false)
  })

  it('returns true for Maundy Thursday (HOLY_WEEK season, Thursday)', () => {
    expect(isHolyDay('2026-04-09', 'HOLY_WEEK')).toBe(true)
  })
})
