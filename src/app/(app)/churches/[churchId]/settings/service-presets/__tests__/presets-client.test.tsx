import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PresetsClient } from "../presets-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

const samplePreset = {
  id: "p1", name: "Default Choral", serviceType: "SUNG_EUCHARIST",
  defaultTime: "10:00", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL", archivedAt: null,
};

describe("PresetsClient", () => {
  beforeEach(() => mockFetch.mockReset());

  it("renders preset names", () => {
    render(<PresetsClient churchId="c1" presets={[samplePreset]} />);
    expect(screen.getByText("Default Choral")).toBeInTheDocument();
  });

  it("renders empty state when no presets", () => {
    render(<PresetsClient churchId="c1" presets={[]} />);
    expect(screen.getByText(/no presets yet/i)).toBeInTheDocument();
  });

  it("calls archive endpoint when Archive clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(<PresetsClient churchId="c1" presets={[samplePreset]} />);
    fireEvent.click(screen.getByText("Archive"));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/churches/c1/presets/p1/archive", { method: "POST" })
    );
  });
});
