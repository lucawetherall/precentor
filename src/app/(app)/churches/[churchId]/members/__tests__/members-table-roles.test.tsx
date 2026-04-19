import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { MembersTable } from "../members-table";

vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const members = [{
  id: "m1", role: "MEMBER", voicePart: "SOPRANO", joinedAt: new Date(), userName: "Alice", userEmail: "alice@x.com",
  roles: [{ id: "ra1", catalogRoleId: "r1", name: "Soprano", isPrimary: true }],
}];

describe("MembersTable with roleSlotsEnabled", () => {
  it("shows role chips when roleSlotsEnabled=true", () => {
    render(<MembersTable initialMembers={members} churchId="c1" isAdmin={true} roleSlotsEnabled={true} />);
    expect(screen.getByText(/Soprano.*primary/)).toBeInTheDocument();
  });

  it("shows voice-part select when roleSlotsEnabled=false", () => {
    render(<MembersTable initialMembers={members} churchId="c1" isAdmin={true} roleSlotsEnabled={false} />);
    expect(screen.queryByText(/primary/)).not.toBeInTheDocument();
  });
});
