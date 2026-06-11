import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { ErrorBoundary } from "../error-boundary";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("kaboom");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  // React logs caught render errors to console.error; silence it for clean output.
  beforeEach(() => { consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => consoleSpy.mockRestore());

  it("renders children when nothing throws", () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("renders the default fallback when a child throws", () => {
    render(<ErrorBoundary><Bomb explode={true} /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    render(<ErrorBoundary fallback={<p>custom oops</p>}><Bomb explode={true} /></ErrorBoundary>);
    expect(screen.getByText("custom oops")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("does not leak the underlying error message to the UI", () => {
    render(<ErrorBoundary><Bomb explode={true} /></ErrorBoundary>);
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
  });

  it("recovers to children after 'Try again' when the child no longer throws", () => {
    function Container() {
      const [explode, setExplode] = useState(true);
      return (
        <div>
          <button onClick={() => setExplode(false)}>fix</button>
          <ErrorBoundary><Bomb explode={explode} /></ErrorBoundary>
        </div>
      );
    }
    render(<Container />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // Stop the child from throwing, then reset the boundary.
    fireEvent.click(screen.getByText("fix"));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });
});
