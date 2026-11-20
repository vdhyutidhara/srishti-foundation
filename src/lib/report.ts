import type { ConnectionPool } from "mssql";
import type { SessionUser } from "./session";
import {
  Q,
  suConditions,
  whereFrom,
  completeExpr,
  suppress,
  taskDone,
  taskOpen,
  type Filters,
} from "./analytics";

export interface ReportPayload {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
  asOf: string;
  generatedBy: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const AGE_CASE = (pfx: string) => {
  const a = `TRY_CAST(LEFT(${pfx}su_age, PATINDEX('%[^0-9]%', ${pfx}su_age + 'x') - 1) AS INT)`;
  return `CASE WHEN ${a} BETWEEN 0 AND 5 THEN '0–5' WHEN ${a} BETWEEN 6 AND 17 THEN '6–17' WHEN ${a} BETWEEN 18 AND 29 THEN '18–29' WHEN ${a} >= 30 THEN '30+' ELSE 'Unknown' END`;
};
const GENDER_CASE = (pfx: string) =>
  `CASE WHEN ${pfx}su_sex LIKE 'F%' THEN 'Female' WHEN ${pfx}su_sex LIKE 'M%' THEN 'Male' ELSE 'Other' END`;

function groupJoin(group: string): string {
  return group === "project" ? "LEFT JOIN block_mstr bm ON bm.blk_id = sm.su_block" : "";
}

function groupExpr(group: string, pfx = "sm."): string {
  switch (group) {
    case "district": return `${pfx}su_district`;
    case "gender": return GENDER_CASE(pfx);
    case "age": return AGE_CASE(pfx);
    case "type": return "t.task_activity";
    case "month": return "FORMAT(t.task_date, 'yyyy-MM')";
    default: return `bm.blk_name`;
  }
}

function groupHeader(group: string): string {
  return (
    {
      project: "Project",
      district: "District",
      gender: "Gender",
      age: "Age group",
      type: "Service type",
      month: "Month",
    }[group] ?? "Group"
  );
}

/** Drop the filter that matches the grouping dimension so every group appears. */
function filtersForGroup(filters: Filters, group: string): Filters {
  const f = { ...filters };
  if (group === "project") f.project = "all";
  if (group === "district") f.district = "all";
  if (group === "gender") f.gender = "all";
  if (group === "age") f.age = "all";
  return f;
}

function label(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return s.trim() === "" ? "Unspecified" : s;
}

export async function buildReport(
  db: ConnectionPool,
  opts: {
    report: string;
    group: string;
    measure: string;
    filters: Filters;
    user: SessionUser;
  },
): Promise<ReportPayload> {
  const { report, group, measure, filters, user } = opts;
  const asOf = new Date().toISOString().slice(0, 10);
  const generatedBy = `${user.name} (${user.label})`;
  const meta = { asOf, generatedBy };

  if (report === "overview") {
    const rows = await overviewRows(db, filters, user);
    return { title: "Management summary", headers: ["Indicator", "Value"], rows, ...meta };
  }

  if (report === "services") {
    const grp = ["project", "month", "type"].includes(group) ? group : "project";
    const q = new Q(db);
    const base = suConditions(q, filtersForGroup(filters, grp), user);
    const start = q.p(new Date(filters.start));
    const end = q.p(new Date(filters.end));
    const ge = groupExpr(grp);
    const res = await q.query<Record<string, unknown>>(`
      SELECT ${ge} AS g, COUNT(*) AS v
      FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
      ${groupJoin(grp)}
      ${whereFrom([...base, `${taskDone("t.")}`, `t.task_date >= ${start}`, `t.task_date < ${end}`])}
      GROUP BY ${ge} ORDER BY v DESC`);
    return {
      title: "Service delivery",
      headers: [groupHeader(grp), "Completed sessions"],
      rows: res.recordset.map((r) => [label(r.g), suppress(num(r.v), user)]),
      ...meta,
    };
  }

  if (report === "followups") {
    const q = new Q(db);
    const base = suConditions(q, filtersForGroup(filters, group), user);
    const ge = groupExpr(group);
    const res = await q.query<Record<string, unknown>>(`
      SELECT ${ge} AS g, COUNT(DISTINCT t.task_serviceuser) AS v
      FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
      ${groupJoin(group)}
      ${whereFrom([...base, `${taskOpen("t.")}`, `t.task_date < GETDATE()`])}
      GROUP BY ${ge} ORDER BY v DESC`);
    return {
      title: "Follow-up review",
      headers: [groupHeader(group), "People overdue"],
      rows: res.recordset.map((r) => [label(r.g), suppress(num(r.v), user)]),
      ...meta,
    };
  }

  if (report === "quality") {
    const q = new Q(db);
    const base = suConditions(q, filtersForGroup(filters, group), user);
    const ge = groupExpr(group);
    const res = await q.query<Record<string, unknown>>(`
      SELECT ${ge} AS g, COUNT(*) AS v
      FROM serviceuser_mstr sm
      ${groupJoin(group)}
      ${whereFrom([...base, `${completeExpr()} = 0`, `sm.su_isActive = 1`])}
      GROUP BY ${ge} ORDER BY v DESC`);
    return {
      title: "Data completeness",
      headers: [groupHeader(group), "Records needing attention"],
      rows: res.recordset.map((r) => [label(r.g), suppress(num(r.v), user)]),
      ...meta,
    };
  }

  // reach (default)
  const q = new Q(db);
  const base = suConditions(q, filtersForGroup(filters, group), user);
  const start = q.p(new Date(filters.start));
  const end = q.p(new Date(filters.end));
  const ge = groupExpr(group);
  let measureExpr: string;
  switch (measure) {
    case "active":
      measureExpr = `SUM(CASE WHEN sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL) THEN 1 ELSE 0 END)`;
      break;
    case "new":
      measureExpr = `SUM(CASE WHEN sm.su_dateofadmission >= ${start} AND sm.su_dateofadmission < ${end} THEN 1 ELSE 0 END)`;
      break;
    case "served":
      measureExpr = `SUM(CASE WHEN (SELECT COUNT(*) FROM task_mstr t WHERE t.task_serviceuser = sm.su_id AND ${taskDone("t.")} AND t.task_date >= ${start} AND t.task_date < ${end}) > 0 THEN 1 ELSE 0 END)`;
      break;
    default:
      measureExpr = "COUNT(*)";
  }
  const measureLabel =
    { active: "Active beneficiaries", served: "People receiving services", new: "New registrations" }[
      measure
    ] ?? "Registered beneficiaries";
  const res = await q.query<Record<string, unknown>>(`
    SELECT ${ge} AS g, ${measureExpr} AS v
    FROM serviceuser_mstr sm
    ${groupJoin(group)}
    ${whereFrom(base)}
    GROUP BY ${ge} ORDER BY v DESC`);
  return {
    title: "Reach & coverage",
    headers: [groupHeader(group), measureLabel],
    rows: res.recordset.map((r) => [label(r.g), suppress(num(r.v), user)]),
    ...meta,
  };
}

async function overviewRows(
  db: ConnectionPool,
  filters: Filters,
  user: SessionUser,
): Promise<(string | number | null)[][]> {
  const q = new Q(db);
  const base = suConditions(q, filters, user);
  const start = q.p(new Date(filters.start));
  const end = q.p(new Date(filters.end));
  const r = await q.query<Record<string, unknown>>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL) THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN sm.su_dateofadmission >= ${start} AND sm.su_dateofadmission < ${end} THEN 1 ELSE 0 END) AS new_reg,
      SUM(CASE WHEN ${completeExpr()} = 0 AND sm.su_isActive = 1 THEN 1 ELSE 0 END) AS incomplete
    FROM serviceuser_mstr sm ${whereFrom(base)}`);
  const sv = new Q(db);
  const svBase = suConditions(sv, filters, user);
  const svStart = sv.p(new Date(filters.start));
  const svEnd = sv.p(new Date(filters.end));
  const served = await sv.query<{ served: number }>(`
    SELECT COUNT(DISTINCT t.task_serviceuser) AS served
    FROM task_mstr t INNER JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
    ${whereFrom([...svBase, `${taskDone("t.")}`, `t.task_date >= ${svStart}`, `t.task_date < ${svEnd}`])}`);
  const row = r.recordset[0] as Record<string, unknown>;
  return [
    ["Registered beneficiaries", suppress(num(row?.total), user)],
    ["Active beneficiaries", suppress(num(row?.active), user)],
    ["New registrations (period)", suppress(num(row?.new_reg), user)],
    ["Receiving services (period)", suppress(num(served.recordset[0]?.served), user)],
    ["Records needing attention", suppress(num(row?.incomplete), user)],
  ];
}
