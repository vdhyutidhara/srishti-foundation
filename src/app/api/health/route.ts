import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";


// GET /api/health
// Returns DB connection status — useful to verify RDS connectivity after deploy.
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.request().query("SELECT 1 AS ok, GETDATE() AS server_time");
    return NextResponse.json({
      status: "ok",
      db: "connected",
      server_time: result.recordset[0].server_time,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { status: "error", db: "unreachable", message },
      { status: 500 }
    );
  }
}
