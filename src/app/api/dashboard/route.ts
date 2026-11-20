import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { projectMeta } from "@/lib/projects";
import {
  Q,
  parseFilters,
  suConditions,
  whereFrom,
  completeExpr,
  taskDone,
  taskOpen,
  type Filters,
} from "@/lib/analytics";
import type { ConnectionPool } from "mssql";


const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(sp);
  const noProject: Filters = { ...filters, project: "all" };
  const noDistrict: Filters = { ...filters, district: "all" };

  try {
    const db = await getDb();

    // Each query owns its binder so @params and execution stay together.
    const run = <T = Record<string, unknown>>(build: (q: Q) => string) => {
      const q = new Q(db as ConnectionPool);
      return q.query<T>(build(q));
    };

    const metricsP = run((q) => {
      const base = suConditions(q, filters, user);
      const start = q.p(new Date(filters.start));
      const end = q.p(new Date(filters.end));
      return `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL) THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN sm.su_dateofadmission >= ${start} AND sm.su_dateofadmission < ${end} THEN 1 ELSE 0 END) AS new_reg,
          SUM(CASE WHEN ${completeExpr()} = 0 AND sm.su_isActive = 1 THEN 1 ELSE 0 END) AS incomplete
        FROM serviceuser_mstr sm ${whereFrom(base)}`;
    });

    const servedP = run((q) => {
      const base = suConditions(q, filters, user);
      const start = q.p(new Date(filters.start));
      const end = q.p(new Date(filters.end));
      return `
        SELECT COUNT(DISTINCT t.task_serviceuser) AS served
        FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        ${whereFrom([...base, `${taskDone("t.")}`, `t.task_date >= ${start}`, `t.task_date < ${end}`])}`;
    });

    const overdueP = run((q) => {
      const base = suConditions(q, filters, user);
      return `
        SELECT COUNT(DISTINCT t.task_serviceuser) AS overdue
        FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        ${whereFrom([...base, `${taskOpen("t.")}`, `t.task_date < GETDATE()`])}`;
    });

    const projectsP = run((q) => {
      const base = suConditions(q, noProject, user);
      const start = q.p(new Date(filters.start));
      const end = q.p(new Date(filters.end));
      return `
        SELECT bm.blk_name AS program,
          COUNT(*) AS registered,
          SUM(CASE WHEN sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL) THEN 1 ELSE 0 END) AS active,
          (SELECT COUNT(DISTINCT t.task_serviceuser) FROM task_mstr t INNER JOIN serviceuser_mstr s2 ON s2.su_id = t.task_serviceuser
             WHERE s2.su_block = sm.su_block AND ${taskDone("t.")} AND t.task_date >= ${start} AND t.task_date < ${end}) AS served,
          (SELECT COUNT(*) FROM task_mstr t2 INNER JOIN serviceuser_mstr s3 ON s3.su_id = t2.task_serviceuser
             WHERE s3.su_block = sm.su_block AND ${taskDone("t2.")} AND t2.task_date >= ${start} AND t2.task_date < ${end}) AS sessions
        FROM serviceuser_mstr sm
        INNER JOIN block_mstr bm ON bm.blk_id = sm.su_block
        ${whereFrom([...base, `sm.su_block IS NOT NULL`])}
        GROUP BY bm.blk_name, sm.su_block
        ORDER BY registered DESC`;
    });

    const districtsP = run((q) => {
      const base = suConditions(q, noDistrict, user);
      return `
        SELECT TOP 8 sm.su_district AS district, COUNT(*) AS value
        FROM serviceuser_mstr sm
        ${whereFrom([...base, `sm.su_district IS NOT NULL`, `sm.su_district <> ''`])}
        GROUP BY sm.su_district
        ORDER BY value DESC`;
    });

    const trendP = run((q) => {
      const base = suConditions(q, noProject, user);
      return `
        SELECT FORMAT(t.task_date, 'yyyy-MM') AS ym, COUNT(*) AS value
        FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        ${whereFrom([...base, `${taskDone("t.")}`, `t.task_date >= DATEADD(MONTH, -6, GETDATE())`])}
        GROUP BY FORMAT(t.task_date, 'yyyy-MM')
        ORDER BY ym`;
    });

    const deliveryP = run((q) => {
      const base = suConditions(q, filters, user);
      const start = q.p(new Date(filters.start));
      const end = q.p(new Date(filters.end));
      return `
        SELECT
          SUM(CASE WHEN ${taskDone("t.")} THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN ${taskOpen("t.")} AND t.task_date < GETDATE() THEN 1 ELSE 0 END) AS missed,
          SUM(CASE WHEN t.task_status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        ${whereFrom([...base, `t.task_date >= ${start}`, `t.task_date < ${end}`])}`;
    });

    const actionsP = user.details
      ? run((q) => {
          const base = suConditions(q, filters, user);
          return `
            SELECT TOP 6 t.task_id, t.task_serviceuser, sm.su_name,
                   t.task_activity, COALESCE(u.usr_name, t.task_owner) AS task_owner, t.task_date
            FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
            LEFT JOIN User_mstr u ON u.usr_id = t.task_owner
            ${whereFrom([...base, `${taskOpen("t.")}`, `t.task_date < GETDATE()`])}
            ORDER BY t.task_date ASC`;
        })
      : Promise.resolve({ recordset: [] as Record<string, unknown>[] });

    const [m, served, overdue, projects, districts, trend, delivery, actions] =
      await Promise.all([
        metricsP, servedP, overdueP, projectsP, districtsP, trendP, deliveryP, actionsP,
      ]);

    const mr = m.recordset[0] as Record<string, unknown>;
    const metrics = [
      { id: "total", label: "Registered beneficiaries", value: num(mr?.total), hint: "Everyone on record in your scope." },
      { id: "active", label: "Active beneficiaries", value: num(mr?.active), hint: "Currently active and not discharged." },
      { id: "new", label: "New registrations", value: num(mr?.new_reg), hint: "Admissions within the selected period." },
      { id: "served", label: "Receiving services", value: num(served.recordset[0]?.served), hint: "People with a completed session this period." },
      { id: "overdue", label: "People overdue", value: num(overdue.recordset[0]?.overdue), hint: "Distinct people with open overdue follow-ups." },
      { id: "incomplete", label: "Records needing attention", value: num(mr?.incomplete), hint: "Active records missing mandatory fields." },
    ];

    const projectRows = projects.recordset.map((r: Record<string, unknown>, i: number) => {
      const meta = projectMeta(String(r.program), i);
      return {
        id: meta.id,
        name: meta.name,
        short: meta.name,
        label: meta.name,
        color: meta.color,
        description: meta.description,
        value: num(r.registered),
        served: num(r.served),
        sessions: num(r.sessions),
        active: num(r.active),
      };
    });

    const ymMap = new Map(
      trend.recordset.map((r: Record<string, unknown>) => [String(r.ym), num(r.value)]),
    );
    const now = new Date();
    const trendRows: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      trendRows.push({ label: MONTH_SHORT[d.getMonth()], value: ymMap.get(ym) ?? 0 });
    }

    const dr = delivery.recordset[0] as Record<string, unknown>;
    const deliveryRows = [
      { label: "Completed", value: num(dr?.completed) },
      { label: "Missed", value: num(dr?.missed) },
      { label: "Cancelled", value: num(dr?.cancelled) },
    ];

    const districtRows = districts.recordset.map((r: Record<string, unknown>) => ({
      label: String(r.district),
      value: num(r.value),
    }));

    const actionRows = (actions.recordset as Record<string, unknown>[]).map((r) => {
      const activity = String(r.task_activity ?? "Follow-up");
      return {
        id: String(r.task_id),
        personId: String(r.task_serviceuser),
        person: String(r.su_name ?? "Unnamed record"),
        type: /assess/i.test(activity) ? "Assessment review" : activity,
        worker: String(r.task_owner ?? "Unassigned"),
        due: toISO(r.task_date),
      };
    });

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      metrics,
      trend: trendRows,
      projects: projectRows,
      actions: actionRows,
      delivery: deliveryRows,
      districts: districtRows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
