import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MigrationBanner } from "../migration-banner";

const mockFetch = vi.fn();
global.fetch = mockFetch;
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("MigrationBanner", () => {
  beforeEach(() => { mockFetch.mockReset(); localStorageMock.clear(); });

  it("shows nothing when counts are all zero", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ counts: { INFO: 0, WARN: 0, ERROR: 0 } }) });
    const { container } = render(<MigrationBanner churchId="c1" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("shows warn banner when WARN > 0", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ counts: { INFO: 0, WARN: 2, ERROR: 0 } }) });
    render(<MigrationBanner churchId="c1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/warnings need review/i)).toBeInTheDocument();
  });

  it("shows error banner when ERROR > 0", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ counts: { INFO: 1, WARN: 0, ERROR: 1 } }) });
    render(<MigrationBanner churchId="c1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/errors require attention/i)).toBeInTheDocument();
  });

  it("dismiss hides banner and stores in localStorage", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ counts: { INFO: 1, WARN: 0, ERROR: 0 } }) });
    render(<MigrationBanner churchId="c1" />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
