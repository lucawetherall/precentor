import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServicesCalendarSeasonRibbon } from '../services-calendar-season-ribbon'
import type { LiturgicalDayWithService } from '@/types/service-views'

function day(date: string, season: LiturgicalDayWithService['season']): LiturgicalDayWithService {
  return { id: date, date, cwName: 'x', season, colour: 'GREEN', collect: null, services: [] }
}

describe('ServicesCalendarSeasonRibbon', () => {
  it('renders nothing when there are no days', () => {
    const { container } = render(<ServicesCalendarSeasonRibbon days={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one segment per contiguous season', () => {
    const days = [
      day('2026-11-01', 'ORDINARY'),
      day('2026-11-15', 'ORDINARY'),
      day('2026-11-29', 'ADVENT'),
    ]
    render(<ServicesCalendarSeasonRibbon days={days} />)
    expect(screen.getByText(/ordinary/i)).toBeInTheDocument()
    expect(screen.getByText(/advent/i)).toBeInTheDocument()
  })

  it('is marked aria-hidden because it is decorative', () => {
    const days = [day('2026-11-01', 'ORDINARY')]
    const { container } = render(<ServicesCalendarSeasonRibbon days={days} />)
    const ribbon = container.firstChild as HTMLElement
    expect(ribbon.getAttribute('aria-hidden')).toBe('true')
  })
})
