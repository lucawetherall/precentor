import { describe, it, expect } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialogProvider } from "../confirm-dialog";
import { useConfirm } from "../use-confirm";

function Harness({ onResult, opts }: { onResult: (r: boolean) => void; opts?: { destructive?: boolean } }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        const result = await confirm({
          title: "Delete this template?",
          description: "This cannot be undone.",
          confirmLabel: "Delete",
          destructive: opts?.destructive,
        });
        onResult(result);
        setBusy(false);
      }}
    >
      {busy ? "asking" : "trigger"}
    </button>
  );
}

function renderWithProvider(onResult: (r: boolean) => void, opts?: { destructive?: boolean }) {
  return render(
    <ConfirmDialogProvider>
      <Harness onResult={onResult} opts={opts} />
    </ConfirmDialogProvider>,
  );
}

describe("ConfirmDialog + useConfirm", () => {
  it("resolves true when the confirm button is clicked", async () => {
    let result: boolean | null = null;
    renderWithProvider((r) => (result = r));

    act(() => screen.getByRole("button", { name: "trigger" }).click());

    await waitFor(() => screen.getByText("Delete this template?"));
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Delete" }).click());

    await waitFor(() => expect(result).toBe(true));
  });

  it("resolves false when the cancel button is clicked", async () => {
    let result: boolean | null = null;
    renderWithProvider((r) => (result = r));

    act(() => screen.getByRole("button", { name: "trigger" }).click());
    await waitFor(() => screen.getByText("Delete this template?"));

    act(() => screen.getByRole("button", { name: "Cancel" }).click());

    await waitFor(() => expect(result).toBe(false));
  });

  it("resolves false when Escape is pressed (Dialog primitive behaviour)", async () => {
    let result: boolean | null = null;
    renderWithProvider((r) => (result = r));

    act(() => screen.getByRole("button", { name: "trigger" }).click());
    await waitFor(() => screen.getByText("Delete this template?"));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    await waitFor(() => expect(result).toBe(false));
  });

  it("supports a destructive style without changing behaviour", async () => {
    let result: boolean | null = null;
    renderWithProvider((r) => (result = r), { destructive: true });

    act(() => screen.getByRole("button", { name: "trigger" }).click());
    await waitFor(() => screen.getByText("Delete this template?"));

    // Destructive variant still confirms with the supplied confirmLabel.
    act(() => screen.getByRole("button", { name: "Delete" }).click());
    await waitFor(() => expect(result).toBe(true));
  });

  it("handles two sequential confirms correctly", async () => {
    const results: boolean[] = [];
    renderWithProvider((r) => results.push(r));

    // First confirm: cancel.
    act(() => screen.getByRole("button", { name: "trigger" }).click());
    await waitFor(() => screen.getByText("Delete this template?"));
    act(() => screen.getByRole("button", { name: "Cancel" }).click());
    await waitFor(() => expect(results).toEqual([false]));

    // Second confirm: confirm.
    act(() => screen.getByRole("button", { name: "trigger" }).click());
    await waitFor(() => screen.getByText("Delete this template?"));
    act(() => screen.getByRole("button", { name: "Delete" }).click());
    await waitFor(() => expect(results).toEqual([false, true]));
  });

  it("throws when useConfirm is called outside a ConfirmDialogProvider", () => {
    function StandaloneHarness() {
      useConfirm();
      return null;
    }
    // React logs the error to console; we only care that the render throws.
    expect(() => render(<StandaloneHarness />)).toThrow(/ConfirmDialogProvider/);
  });
});
