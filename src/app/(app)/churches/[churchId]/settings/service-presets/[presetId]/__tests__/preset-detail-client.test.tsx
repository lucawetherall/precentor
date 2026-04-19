import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PresetDetailClient } from "../preset-detail-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

const preset = { id: "p1", name: "Default Choral", serviceType: "SUNG_EUCHARIST", defaultTime: "10:00", choirRequirement: "FULL_CHOIR", musicListFieldSet: "CHORAL" };
const catalog = [
  { id: "r1", key: "SOPRANO", defaultName: "Soprano", category: "VOICE", rotaEligible: true },
  { id: "r2", key: "ORGANIST", defaultName: "Organist", category: "MUSIC_INSTRUMENT", rotaEligible: true },
];
const slots = [{ id: "sl1", catalogRoleId: "r2", minCount: 1, maxCount: 1, exclusive: true, displayOrder: 10 }];

describe("PresetDetailClient", () => {
  beforeEach(() => mockFetch.mockReset());

  it("renders slot rows", () => {
    render(<PresetDetailClient churchId="c1" preset={preset} slots={slots} catalog={catalog} />);
    expect(screen.getByText("Organist")).toBeInTheDocument();
  });

  it("voice-part exclusive column shows N/A", () => {
    const voiceSlot = [{ id: "sl2", catalogRoleId: "r1", minCount: 1, maxCount: null, exclusive: false, displayOrder: 10 }];
    render(<PresetDetailClient churchId="c1" preset={preset} slots={voiceSlot} catalog={catalog} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("Add slot button triggers POST", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "sl3", catalogRoleId: "r1", minCount: 1, maxCount: null, exclusive: false, displayOrder: 20 }) });
    render(<PresetDetailClient churchId="c1" preset={preset} slots={[]} catalog={catalog} />);
    fireEvent.click(screen.getByText("+ Add slot"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "r1" } });
    fireEvent.click(screen.getByText("Add slot"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/churches/c1/presets/p1/slots",
      expect.objectContaining({ method: "POST" }),
    ));
  });

  it("Remove slot triggers DELETE", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ deleted: true }) });
    render(<PresetDetailClient churchId="c1" preset={preset} slots={slots} catalog={catalog} />);
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/churches/c1/presets/p1/slots/sl1",
      expect.objectContaining({ method: "DELETE" }),
    ));
  });
});
