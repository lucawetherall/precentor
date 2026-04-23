import { requireAuth } from "./permissions";
import { apiError, ErrorCodes } from "@/lib/api-helpers";

export async function requireSuperAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, error };
  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!user || !allowlist.includes(user.email)) {
    return { user: null, error: apiError("Super-admin only", 403, { code: ErrorCodes.FORBIDDEN }) };
  }
  return { user, error: null };
}
