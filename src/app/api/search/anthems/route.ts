import { NextRequest, NextResponse } from "next/server";
import { searchAnthems } from "@/lib/search/anthems";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const churchId = searchParams.get("churchId") || undefined;

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchAnthems(q, churchId);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}
