export function useRoleSlotsModel(): boolean {
  return process.env.USE_ROLE_SLOTS_MODEL === "true";
}
