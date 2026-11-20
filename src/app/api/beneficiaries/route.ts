import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  Q,
  parseFilters,
  suConditions,
  whereFrom,
  completeExpr,
  metricConditions,
  taskDone,
} from "@/lib/analytics";
import type { ConnectionPool } from "mssql";


const PAGE_SIZE = 20;

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });
  if (!user.details)
    return NextResponse.json(
      { message: "Your role has aggregate access only." },
      { status: 403 },
    );

  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(sp);
  const metric = sp.get("metric") ?? "total";
  const search = (sp.get("q") ?? "").trim();
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const db = await getDb();

    const buildConds = (q: Q): string[] => {
      const c = suConditions(q, filters, user);
      c.push(
        ...metricConditions(
          metric,
          q.p(new Date(filters.start)),
          q.p(new Date(filters.end)),
        ),
      );
      if (search) {
        const like = q.p("%" + search + "%");
        c.push(`(sm.su_name LIKE ${like} OR sm.su_patientno LIKE ${like})`);
      }
      return c;
    };

    const rowsQ = new Q(db as ConnectionPool);
    const rowsConds = buildConds(rowsQ);
    const rowsSql = `
      SELECT sm.su_id, sm.su_name, sm.su_program, sm.su_district,
             COALESCE(u.usr_name, sm.su_owner) AS su_owner,
             CASE WHEN sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL) THEN 'Active' ELSE 'Inactive' END AS status,
             ${completeExpr()} AS complete,
             (SELECT MAX(t.task_date) FROM task_mstr t WHERE t.task_serviceuser = sm.su_id AND ${taskDone("t.")}) AS last_service
      FROM serviceuser_mstr sm
      LEFT JOIN User_mstr u ON u.usr_id = sm.su_owner
      ${whereFrom(rowsConds)}
      ORDER BY sm.su_name
      OFFSET ${offset} ROWS FETCH NEXT ${PAGE_SIZE} ROWS ONLY`;

    const countQ = new Q(db as ConnectionPool);
    const countConds = buildConds(countQ);
    const countSql = `SELECT COUNT(*) AS cnt FROM serviceuser_mstr sm ${whereFrom(countConds)}`;

    const [rows, total] = await Promise.all([
      rowsQ.query(rowsSql),
      countQ.query<{ cnt: number }>(countSql),
    ]);

    return NextResponse.json({
      rows: rows.recordset.map((r: Record<string, unknown>) => ({
        id: String(r.su_id),
        name: String(r.su_name ?? "Unnamed record"),
        projects: String(r.su_program ?? "—"),
        district: String(r.su_district ?? "—"),
        worker: String(r.su_owner ?? "Unassigned"),
        lastService: toISO(r.last_service),
        status: String(r.status),
        complete: Number(r.complete) === 1,
      })),
      total: Number(total.recordset[0]?.cnt ?? 0),
      page,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}

function toISO(v: unknown): string {
  if (!v) return "";
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
