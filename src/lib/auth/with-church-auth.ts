import { requireChurchRole } from "./permissions";
import type { MemberRole } from "@/types";
import type { NextRequest } from "next/server";

interface AuthContext {
  userId: string;
  churchId: string;
  role: MemberRole;
}

type RouteParams = { params: Promise<{ churchId: string; [key: string]: string }> };

export function withChurchAuth(
  minRole: MemberRole,
  handler: (request: NextRequest, context: AuthContext, params: Record<string, string>) => Promise<Response>
) {
  return async (request: NextRequest, { params }: RouteParams) => {
    const resolvedParams = await params;
    const { churchId } = resolvedParams;
    const { user, membership, error } = await requireChurchRole(churchId, minRole);
    if (error) return error;
    return handler(request, {
      userId: user!.id,
      churchId,
      role: membership!.role as MemberRole,
    }, resolvedParams);
  };
}
