import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  Q,
  parseFilters,
  suConditions,
  whereFrom,
  completeExpr,
  taskOpen,
  noRecentReview,
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
    const run = <T = Record<string, unknown>>(build: (q: Q) => string) => {
      const q = new Q(db as ConnectionPool);
      return q.query<T>(build(q));
    };

    // Counts (always returned; drive the tiles).
    const countsP = Promise.all([
      run<{ c: number }>((q) => {
        const b = suConditions(q, filters, user);
        return `SELECT COUNT(DISTINCT t.task_serviceuser) AS c FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser ${whereFrom([...b, taskOpen("t."), `t.task_date < GETDATE()`])}`;
      }),
      run<{ c: number }>((q) => {
        const b = suConditions(q, filters, user);
        return `SELECT COUNT(*) AS c FROM treatmentEvaluation_dtl te INNER JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser ${whereFrom([...b, `te.trevl_status <> 'Completed'`, `te.trevl_assigndt < DATEADD(DAY, -30, GETDATE())`])}`;
      }),
      run<{ c: number }>((q) => {
        const b = suConditions(q, filters, user);
        return `SELECT COUNT(*) AS c FROM serviceuser_mstr sm ${whereFrom([...b, `${completeExpr()} = 0`, `sm.su_isActive = 1`])}`;
      }),
      run<{ c: number }>((q) => {
        const b = suConditions(q, filters, user);
        return `SELECT COUNT(*) AS c FROM treatment_mstr tr INNER JOIN serviceuser_mstr sm ON sm.su_id = tr.tr_serviceuser ${whereFrom([...b, `tr.tr_status <> 'Completed'`, `tr.tr_enddate IS NOT NULL`, `tr.tr_enddate < GETDATE()`])}`;
      }),
      run<{ c: number }>((q) => {
        const b = suConditions(q, filters, user);
        return `SELECT COUNT(*) AS c FROM serviceuser_mstr sm ${whereFrom([...b, noRecentReview(6)])}`;
      }),
    ]);

    // Detail lists only for roles that can see individual records.
    const listsP = user.details
      ? Promise.all([
          run((q) => {
            const b = suConditions(q, filters, user);
            return `SELECT TOP 30 t.task_id AS id, t.task_serviceuser AS pid, sm.su_name AS person,
                      COALESCE(u.usr_name, t.task_owner) AS worker, t.task_activity AS detail, t.task_date AS due,
                      DATEDIFF(DAY, t.task_date, GETDATE()) AS days
                    FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
                    LEFT JOIN User_mstr u ON u.usr_id = t.task_owner
                    ${whereFrom([...b, taskOpen("t."), `t.task_date < GETDATE()`])} ORDER BY t.task_date ASC`;
          }),
          run((q) => {
            const b = suConditions(q, filters, user);
            return `SELECT TOP 30 te.trevl_id AS id, te.trevl_serviceuser AS pid, sm.su_name AS person,
                      te.trevl_evalno AS detail, te.trevl_assigndt AS due,
                      DATEDIFF(DAY, te.trevl_assigndt, GETDATE()) AS days
                    FROM treatmentEvaluation_dtl te INNER JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser
                    ${whereFrom([...b, `te.trevl_status <> 'Completed'`, `te.trevl_assigndt < DATEADD(DAY, -30, GETDATE())`])} ORDER BY te.trevl_assigndt ASC`;
          }),
          run((q) => {
            const b = suConditions(q, filters, user);
            return `SELECT TOP 30 sm.su_id AS pid, sm.su_name AS person, sm.su_patientno AS detail
                    FROM serviceuser_mstr sm ${whereFrom([...b, `${completeExpr()} = 0`, `sm.su_isActive = 1`])} ORDER BY sm.su_name`;
          }),
          run((q) => {
            const b = suConditions(q, filters, user);
            return `SELECT TOP 30 tr.tr_id AS id, tr.tr_serviceuser AS pid, sm.su_name AS person,
                      tr.tr_goal AS detail, tr.tr_enddate AS due, DATEDIFF(DAY, tr.tr_enddate, GETDATE()) AS days
                    FROM treatment_mstr tr INNER JOIN serviceuser_mstr sm ON sm.su_id = tr.tr_serviceuser
                    ${whereFrom([...b, `tr.tr_status <> 'Completed'`, `tr.tr_enddate IS NOT NULL`, `tr.tr_enddate < GETDATE()`])} ORDER BY tr.tr_enddate ASC`;
          }),
          run((q) => {
            const b = suConditions(q, filters, user);
            return `SELECT TOP 30 sm.su_id AS pid, sm.su_name AS person,
                      (SELECT MAX(t.task_date) FROM task_mstr t WHERE t.task_serviceuser = sm.su_id AND t.task_status = 'Closed') AS due
                    FROM serviceuser_mstr sm ${whereFrom([...b, noRecentReview(6)])} ORDER BY sm.su_name`;
          }),
        ])
      : Promise.resolve(null);

    const [counts, lists] = await Promise.all([countsP, listsP]);
    const mapList = (rs: Record<string, unknown>[]) =>
      rs.map((r) => ({
        id: String(r.id ?? r.pid ?? ""),
        personId: String(r.pid ?? ""),
        person: String(r.person ?? "Unnamed record"),
        worker: r.worker ? String(r.worker) : undefined,
        detail: r.detail ? String(r.detail) : undefined,
        due: toISO(r.due),
        days: r.days == null ? undefined : num(r.days),
      }));

    return NextResponse.json({
      counts: {
        overdue: num(counts[0].recordset[0]?.c),
        assessmentsDue: num(counts[1].recordset[0]?.c),
        incomplete: num(counts[2].recordset[0]?.c),
        expired: num(counts[3].recordset[0]?.c),
        noReview: num(counts[4].recordset[0]?.c),
      },
      details: user.details,
      overdue: lists ? mapList(lists[0].recordset) : [],
      assessmentsDue: lists ? mapList(lists[1].recordset) : [],
      incomplete: lists ? mapList(lists[2].recordset) : [],
      expired: lists ? mapList(lists[3].recordset) : [],
      noReview: lists ? mapList(lists[4].recordset) : [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
