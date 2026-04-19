import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { MembersTable } from "../members-table";

vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const members = [{
  id: "m1", role: "MEMBER", joinedAt: new Date(), userName: "Alice", userEmail: "alice@x.com",
  roles: [{ id: "ra1", catalogRoleId: "r1", name: "Soprano", isPrimary: true }],
}];

describe("MembersTable with role pills", () => {
  it("shows role chips when roles are present", () => {
    render(<MembersTable initialMembers={members} churchId="c1" isAdmin={true} />);
    expect(screen.getByText(/Soprano.*primary/)).toBeInTheDocument();
  });

  it("shows dash when no roles assigned", () => {
    const noRoles = [{ ...members[0], roles: [] }];
    render(<MembersTable initialMembers={noRoles} churchId="c1" isAdmin={true} />);
    expect(screen.queryByText(/primary/)).not.toBeInTheDocument();
  });
});
