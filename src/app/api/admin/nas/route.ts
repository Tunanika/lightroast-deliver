import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { browseNas } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lists NAS entries for a (partial) path + the validity of the full path.
// Powers the Add file typeahead. Admin-only (also gated by middleware).
export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = req.nextUrl.searchParams.get("path") ?? "";
  const res = browseNas(input);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res.result);
}
