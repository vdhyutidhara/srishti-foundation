import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseFilters } from "@/lib/analytics";
import { buildReport } from "@/lib/report";
import type { ConnectionPool } from "mssql";


export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(sp);

  try {
    const db = await getDb();
    const payload = await buildReport(db as ConnectionPool, {
      report: sp.get("report") ?? "reach",
      group: sp.get("group") ?? "project",
      measure: sp.get("metric") ?? "total",
      filters,
      user,
    });
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
