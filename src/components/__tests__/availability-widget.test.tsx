import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AvailabilityWidget } from '../availability-widget'

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AvailabilityWidget', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })

  it('renders three availability buttons', () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" />)
    expect(screen.getByRole('button', { name: 'Available' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeInTheDocument()
  })

  it('marks the correct button as pressed when currentStatus is set', () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    expect(screen.getByRole('button', { name: 'Available' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('fires POST with AVAILABLE when clicking Available from null state', async () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Available' }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/churches/c1/availability',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ serviceId: 's1', status: 'AVAILABLE' }),
        })
      )
    )
  })

  it('fires DELETE when clicking the active button to deselect', async () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Available' }))
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/churches/c1/availability',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ serviceId: 's1' }),
        })
      )
    )
  })

  it('reverts to previous status on API error', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus="AVAILABLE" size="md" />)
    fireEvent.click(screen.getByRole('button', { name: 'Maybe' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Available' })).toHaveAttribute('aria-pressed', 'true')
    )
  })

  it("renders em-dash with tooltip when not eligible", () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} eligible={false} eligibleReason="SAID" />);
    expect(screen.queryByRole("button", { name: /available/i })).not.toBeInTheDocument();
    const dash = screen.getByText("—");
    expect(dash).toBeInTheDocument();
    expect(dash.closest("[title]")).toHaveAttribute("title", "Not required for this service");
  });

  it("renders em-dash with NO_ROLE reason", () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} eligible={false} eligibleReason="NO_ROLE" />);
    const dash = screen.getByText("—");
    expect(dash.closest("[title]")).toHaveAttribute("title", "You don't have a role required for this service");
  });

  it("renders buttons when eligible=true", () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} eligible={true} />);
    expect(screen.getByRole("button", { name: "Available" })).toBeInTheDocument();
  });

  it("renders buttons when eligible is undefined (default)", () => {
    render(<AvailabilityWidget serviceId="s1" churchId="c1" currentStatus={null} />);
    expect(screen.getByRole("button", { name: "Available" })).toBeInTheDocument();
  });
})
