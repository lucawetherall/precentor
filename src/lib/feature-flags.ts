// Phase D: USE_ROLE_SLOTS_MODEL flag removed — role-slots model is always active.
// This export is kept for any remaining call-sites until they are cleaned up.
/** @deprecated Always returns true as of Phase D. Remove call-sites and this function. */
export function useRoleSlotsModel(): boolean {
  return true;
}
