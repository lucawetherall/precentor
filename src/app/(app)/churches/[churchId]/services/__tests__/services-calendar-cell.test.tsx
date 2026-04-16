import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ServicesCalendarCell } from '../services-calendar-cell'
import type { LiturgicalDayWithService, ServiceSummary } from '@/types/service-views'

function makeService(overrides: Partial<ServiceSummary> = {}): ServiceSummary {
  return {
    id: 's1',
    serviceType: 'SUNG_EUCHARIST',
    time: '10:00',
    status: 'DRAFT',
    choirStatus: 'CHOIR_REQUIRED',
    userAvailability: null,
    musicPreview: [],
    musicStatus: 'empty',
    rotaStatus: 'empty',
    ...overrides,
  }
}

function makeDay(
  overrides: Partial<LiturgicalDayWithService> = {}
): LiturgicalDayWithService {
  return {
    id: 'd1',
    date: '2026-11-15',
    cwName: 'Trinity 23',
    season: 'ORDINARY',
    colour: 'GREEN',
    collect: null,
    services: [],
    ...overrides,
  }
}

describe('ServicesCalendarCell — outside month', () => {
  it('renders only the day number when outside the visible month', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ date: '2026-10-26' })}
        dateStr="2026-10-26"
        isOutsideMonth={true}
        isSunday={false}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('26')).toBeInTheDocument()
    expect(screen.queryByText(/Trinity/)).not.toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — empty day', () => {
  it('renders the day number and nothing else when no services', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={null}
        dateStr="2026-11-04"
        isOutsideMonth={false}
        isSunday={false}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders today with an accessible Today marker', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={null}
        dateStr="2026-11-11"
        isOutsideMonth={false}
        isSunday={false}
        isToday={true}
        role="MEMBER"
      />
    )
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText(/^Today$/i)).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — weekday feast', () => {
  it('renders the feast name even without a service', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ date: '2026-11-02', cwName: 'All Souls', services: [] })}
        dateStr="2026-11-02"
        isOutsideMonth={false}
        isSunday={false}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('All Souls')).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — editor with one service', () => {
  it('renders the service title, time, and music count', () => {
    const day = makeDay({
      services: [
        makeService({
          time: '10:00',
          musicPreview: [
            { id: 'm1', slotType: 'HYMN', positionOrder: 1, title: 'Praise my soul' },
            { id: 'm2', slotType: 'HYMN', positionOrder: 2, title: 'Guide me' },
          ],
          musicStatus: 'partial',
          rotaStatus: 'ready',
        }),
      ],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('Sung Eucharist')).toBeInTheDocument()
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
    expect(screen.getByText('Praise my soul')).toBeInTheDocument()
    expect(screen.getByText('Guide me')).toBeInTheDocument()
  })

  it('links the service card to the service detail page', () => {
    const day = makeDay({ services: [makeService()] })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    const link = screen.getByRole('link', { name: /Sung Eucharist/ })
    expect(link).toHaveAttribute('href', '/churches/c1/services/2026-11-15')
  })

  it('shows "+ Plan service" affordance on an empty Sunday for editors', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ services: [] })}
        dateStr="2026-11-15"
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    const plan = screen.getByRole('link', { name: /plan service/i })
    expect(plan).toHaveAttribute('href', '/churches/c1/services/2026-11-15?mode=edit')
  })

  it('does NOT show "+ Plan service" affordance for members', () => {
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={makeDay({ services: [] })}
        dateStr="2026-11-15"
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.queryByRole('link', { name: /plan service/i })).toBeNull()
  })
})

describe('ServicesCalendarCell — multiple services', () => {
  it('renders up to 2 services in full and collapses the rest to a "+ N more" link', () => {
    const day = makeDay({
      services: [
        makeService({ id: 's1', serviceType: 'SUNG_EUCHARIST', time: '08:00' }),
        makeService({ id: 's2', serviceType: 'CHORAL_EVENSONG', time: '18:30' }),
        makeService({ id: 's3', serviceType: 'COMPLINE', time: '21:00' }),
      ],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="EDITOR"
      />
    )
    expect(screen.getByText('Sung Eucharist')).toBeInTheDocument()
    expect(screen.getByText('Choral Evensong')).toBeInTheDocument()
    expect(screen.queryByText('Compline')).toBeNull()
    expect(screen.getByText('+ 1 more')).toBeInTheDocument()
  })
})

describe('ServicesCalendarCell — member availability', () => {
  it('shows the member availability state when set', () => {
    const day = makeDay({
      services: [makeService({ userAvailability: 'AVAILABLE' })],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText(/available/i)).toBeInTheDocument()
  })

  it('shows "not set" when member availability is null', () => {
    const day = makeDay({
      services: [makeService({ userAvailability: null })],
    })
    render(
      <ServicesCalendarCell
        churchId="c1"
        day={day}
        dateStr={day.date}
        isOutsideMonth={false}
        isSunday={true}
        isToday={false}
        role="MEMBER"
      />
    )
    expect(screen.getByText(/not set/i)).toBeInTheDocument()
  })
})
