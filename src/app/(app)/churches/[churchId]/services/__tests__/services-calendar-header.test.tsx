import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ServicesCalendarHeader } from '../services-calendar-header'

describe('ServicesCalendarHeader', () => {
  it('renders the month and year title', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10} // November
        serviceCount={5}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/November 2026/)).toBeInTheDocument()
  })

  it('renders the service count in the header', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={12}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/12 services/)).toBeInTheDocument()
  })

  it('pluralises service count correctly when there is exactly one service', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={1}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    expect(screen.getByText(/1 service$/)).toBeInTheDocument()
  })

  it('calls onPrev when the previous month button is clicked', () => {
    const onPrev = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={onPrev}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }))
    expect(onPrev).toHaveBeenCalledOnce()
  })

  it('calls onNext when the next month button is clicked', () => {
    const onNext = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={onNext}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /next month/i }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('disables the Today button when isCurrentMonth is true', () => {
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={true}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onSelectMonth={() => {}}
      />
    )
    const today = screen.getByRole('button', { name: /today/i })
    expect(today).toBeDisabled()
  })

  it('calls onToday when the Today button is clicked', () => {
    const onToday = vi.fn()
    render(
      <ServicesCalendarHeader
        year={2026}
        month={10}
        serviceCount={0}
        isCurrentMonth={false}
        onPrev={() => {}}
        onNext={() => {}}
        onToday={onToday}
        onSelectMonth={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /today/i }))
    expect(onToday).toHaveBeenCalledOnce()
  })
})
