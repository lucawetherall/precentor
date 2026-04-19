import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { InstitutionClient } from "../institution-client";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

const roles = [{ id: "r1", key: "VICAR", defaultName: "Vicar", category: "CLERGY_PARISH" }];
const members = [{ id: "u1", name: "Alice", email: "alice@example.com" }];

describe("InstitutionClient", () => {
  beforeEach(() => mockFetch.mockReset());

  it("renders role names", () => {
    render(<InstitutionClient churchId="c1" institutionalRoles={roles} appointees={[]} members={members} />);
    expect(screen.getByText("Vicar")).toBeInTheDocument();
  });

  it("shows appointee chips", () => {
    const appointees = [{ assignmentId: "a1", userId: "u1", catalogRoleId: "r1", userName: "Alice", userEmail: "alice@example.com" }];
    render(<InstitutionClient churchId="c1" institutionalRoles={roles} appointees={appointees} members={members} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("revoke fires DELETE endpoint", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ deleted: true }) });
    const appointees = [{ assignmentId: "a1", userId: "u1", catalogRoleId: "r1", userName: "Alice", userEmail: "alice@example.com" }];
    render(<InstitutionClient churchId="c1" institutionalRoles={roles} appointees={appointees} members={members} />);
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("/api/churches/c1/members/u1/roles/a1", { method: "DELETE" }));
  });
});
