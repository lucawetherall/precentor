import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast";

function Trigger({ message, type }: { message: string; type?: "success" | "error" | "info" | "warning" }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(message, type)}>add</button>;
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("useToast / ToastProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("throws when used outside a ToastProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger message="x" />)).toThrow(/within ToastProvider/);
    spy.mockRestore();
  });

  it("renders a toast with the given message", () => {
    renderWithProvider(<Trigger message="Saved!" type="success" />);
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("auto-dismisses a non-error toast after 4 seconds", () => {
    renderWithProvider(<Trigger message="Heads up" type="info" />);
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText("Heads up")).not.toBeInTheDocument();
  });

  it("keeps an error toast on screen and announces it assertively", () => {
    renderWithProvider(<Trigger message="It broke" type="error" />);
    act(() => { fireEvent.click(screen.getByText("add")); });
    act(() => { vi.advanceTimersByTime(10_000); });
    const toast = screen.getByText("It broke").closest("[role]");
    expect(toast).toHaveAttribute("role", "alert");
    expect(toast).toHaveAttribute("aria-live", "assertive");
  });

  it("removes a toast when its dismiss button is clicked", () => {
    renderWithProvider(<Trigger message="Dismiss me" type="info" />);
    act(() => { fireEvent.click(screen.getByText("add")); });
    act(() => { fireEvent.click(screen.getByLabelText("Dismiss notification")); });
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });
});
