import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import NewPresetForm from "../new-preset-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ churchId: "c1" }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("NewPresetForm", () => {
  it("renders the create form", () => {
    render(<NewPresetForm />);
    expect(screen.getByRole("heading", { name: /create preset/i })).toBeInTheDocument();
  });
  it("submits the form with correct payload", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "p2" }) });
    render(<NewPresetForm />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Preset" } });
    fireEvent.submit(screen.getByRole("form") ?? screen.getByText("Create preset").closest("form")!);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/churches/c1/presets",
      expect.objectContaining({ method: "POST" }),
    ));
  });
});
