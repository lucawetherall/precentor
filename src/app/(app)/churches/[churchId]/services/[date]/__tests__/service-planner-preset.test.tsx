import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock all the heavy deps so we can render ServicePlanner in isolation
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock("../section-editor", () => ({
  SectionEditor: () => <div data-testid="section-editor" />,
}));
vi.mock("../service-settings", () => ({
  ServiceSettings: () => <div data-testid="service-settings" />,
}));
vi.mock("../booklet-preview", () => ({
  BookletPreview: () => <div data-testid="booklet-preview" />,
}));
vi.mock("../service-editor-context", () => ({
  ServiceEditorProvider: ({ children }: any) => <>{children}</>,
}));
vi.mock("../save-status-indicator", () => ({
  SaveStatusIndicator: () => <div data-testid="save-status" />,
}));
vi.mock("../section-count-badge", () => ({
  SectionCountBadge: () => <span />,
}));
vi.mock("../service-nav", () => ({
  ServiceNav: () => <div data-testid="service-nav" />,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <>{children}</>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ServicePlanner } from "../service-planner";

const adjacent = { prev: null, next: null };

describe("ServicePlanner preset dropdown", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows preset dropdown when presets exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "p1", name: "Sunday Eucharist", serviceType: "SUNG_EUCHARIST" }] }),
    });

    render(
      <ServicePlanner
        churchId="c1"
        liturgicalDayId="d1"
        date="2026-05-01"
        existingServices={[]}
        adjacent={adjacent}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Preset")).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "Sunday Eucharist" })).toBeInTheDocument();
  });

  it("sends presetId in POST body when preset is selected", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: "p1", name: "Sunday Eucharist", serviceType: "SUNG_EUCHARIST" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "svc1", serviceType: "SUNG_EUCHARIST", sheetMode: "summary", includeReadingText: true, status: "DRAFT", notes: null, eucharisticPrayer: null, eucharisticPrayerId: null, defaultMassSettingId: null, collectId: null, collectOverride: null, time: null }),
      })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    render(
      <ServicePlanner
        churchId="c1"
        liturgicalDayId="d1"
        date="2026-05-01"
        existingServices={[]}
        adjacent={adjacent}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Preset")).toBeInTheDocument();
    });

    // Select the preset
    fireEvent.change(screen.getByLabelText("Preset"), { target: { value: "p1" } });

    // Click Add button
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/services"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"presetId":"p1"'),
        })
      );
    });
  });
});
