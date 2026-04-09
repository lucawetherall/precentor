import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ServicesCalendarMonthPicker } from '../services-calendar-month-picker'

describe('ServicesCalendarMonthPicker', () => {
  it('renders the starting year in the header', () => {
    render(
      <ServicesCalendarMonthPicker
        year={2026}
        month={3}
        onSelect={() => {}}
      />
    )
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('renders all twelve month buttons', () => {
    render(
      <ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />
    )
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    for (const m of months) {
      expect(screen.getByRole('button', { name: m })).toBeInTheDocument()
    }
  })

  it('marks the current month as aria-pressed', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    const april = screen.getByRole('button', { name: 'Apr' })
    expect(april.getAttribute('aria-pressed')).toBe('true')
    const may = screen.getByRole('button', { name: 'May' })
    expect(may.getAttribute('aria-pressed')).toBe('false')
  })

  it('calls onSelect with year and month when a month is clicked', () => {
    const onSelect = vi.fn()
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jul' }))
    expect(onSelect).toHaveBeenCalledWith(2026, 6)
  })

  it('advances the displayed year when the forward stepper is clicked', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /next year/i }))
    expect(screen.getByText('2027')).toBeInTheDocument()
  })

  it('goes back when the previous year stepper is clicked', () => {
    render(<ServicesCalendarMonthPicker year={2026} month={3} onSelect={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /previous year/i }))
    expect(screen.getByText('2025')).toBeInTheDocument()
  })
})
