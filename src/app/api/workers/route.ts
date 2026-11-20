import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  Q,
  parseFilters,
  suConditions,
  whereFrom,
  taskDone,
  taskOpen,
} from "@/lib/analytics";
import type { ConnectionPool } from "mssql";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toISO(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });
  if (user.scope !== "org")
    return NextResponse.json({ message: "Not available for this role." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(sp);

  try {
    const db = await getDb();
    const q = new Q(db as ConnectionPool);
    const base = suConditions(q, filters, user);
    const start = q.p(new Date(filters.start));
    const end = q.p(new Date(filters.end));
    const res = await q.query<Record<string, unknown>>(`
      SELECT COALESCE(u.usr_name, t.task_owner) AS worker,
        COUNT(DISTINCT t.task_serviceuser) AS caseload,
        SUM(CASE WHEN ${taskDone("t.")} THEN 1 ELSE 0 END) AS visits_done,
        SUM(CASE WHEN ${taskOpen("t.")} AND t.task_date >= GETDATE() THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN ${taskOpen("t.")} AND t.task_date < GETDATE() THEN 1 ELSE 0 END) AS overdue,
        MAX(CASE WHEN ${taskDone("t.")} THEN t.task_date ELSE NULL END) AS last_activity
      FROM task_mstr t
      INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
      LEFT JOIN User_mstr u ON u.usr_id = t.task_owner
      ${whereFrom([...base, `t.task_owner IS NOT NULL`, `t.task_date >= ${start}`, `t.task_date < ${end}`])}
      GROUP BY COALESCE(u.usr_name, t.task_owner)
      ORDER BY caseload DESC`);

    return NextResponse.json({
      workers: res.recordset.map((r) => ({
        worker: String(r.worker ?? "Unassigned"),
        caseload: num(r.caseload),
        visitsDone: num(r.visits_done),
        pending: num(r.pending),
        overdue: num(r.overdue),
        lastActivity: toISO(r.last_activity),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
