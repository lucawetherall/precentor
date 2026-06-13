import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { RotaGridV2 } from "../rota-grid";

vi.mock("@/components/availability-widget", () => ({
  AvailabilityWidget: ({ eligible }: { eligible: boolean }) => <div data-testid="avail" data-eligible={String(eligible)} />,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ addToast: () => {} }),
}));

const services = [{
  serviceId: "s1", serviceType: "SUNG_EUCHARIST", time: "10:00", date: "2026-05-01", cwName: "Easter 4",
  slots: [{ catalogRoleId: "r1", catalogRoleKey: "SOPRANO" }],
}];
const members = [{
  userId: "u1", name: "Alice", email: "alice@x.com",
  roles: [{ id: "mr1", catalogRoleId: "r1", catalogRoleKey: "SOPRANO", catalogRoleName: "Soprano", isPrimary: true }],
}];

describe("RotaGridV2", () => {
  it("renders member names", () => {
    render(<RotaGridV2 churchId="c1" services={services} members={members} availabilityData={[]} rotaData={[]} currentUserId="u1" canEditOthers />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("marks member as eligible when they have a matching role", () => {
    render(<RotaGridV2 churchId="c1" services={services} members={members} availabilityData={[]} rotaData={[]} currentUserId="u1" canEditOthers />);
    expect(screen.getByTestId("avail")).toHaveAttribute("data-eligible", "true");
  });

  it("marks member as not eligible when no matching role", () => {
    const noRoleMembers = [{ ...members[0], roles: [{ id: "mr2", catalogRoleId: "r2", catalogRoleKey: "BASS", catalogRoleName: "Bass", isPrimary: false }] }];
    render(<RotaGridV2 churchId="c1" services={services} members={noRoleMembers} availabilityData={[]} rotaData={[]} currentUserId="u1" canEditOthers />);
    expect(screen.getByTestId("avail")).toHaveAttribute("data-eligible", "false");
  });

  it("toggles to role-grouped view", () => {
    render(<RotaGridV2 churchId="c1" services={services} members={members} availabilityData={[]} rotaData={[]} currentUserId="u1" canEditOthers />);
    fireEvent.click(screen.getByText("By role"));
    // The role-grouped header is a <td>; an eligible singer now also gets a
    // "+ Soprano" assign button, so scope the assertion to the header cell.
    expect(screen.getByText("Soprano", { selector: "td" })).toBeInTheDocument();
  });
});
