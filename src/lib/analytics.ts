import type { ConnectionPool, IResult } from "mssql";
import type { SessionUser } from "./session";

export interface Filters {
  project: string;
  district: string;
  start: string;
  end: string;
  status: string;
  gender: string;
  age: string;
  worker: string;
  support: string;
}

export function parseFilters(sp: URLSearchParams): Filters {
  return {
    project: sp.get("project") ?? "all",
    district: sp.get("district") ?? "all",
    start: sanitizeDate(sp.get("start")) ?? "2026-10-01",
    end: sanitizeDate(sp.get("end")) ?? "2026-11-01",
    status: sp.get("status") ?? "all",
    gender: sp.get("gender") ?? "all",
    age: sp.get("age") ?? "all",
    worker: sp.get("worker") ?? "",
    support: sp.get("support") ?? "all",
  };
}

function sanitizeDate(v: string | null): string | null {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * Parameter binder. Collects values and emits `@p0`, `@p1`, … placeholders so
 * every user-supplied value goes through mssql parameterization.
 */
export class Q {
  private req: ReturnType<ConnectionPool["request"]>;
  private n = 0;
  constructor(db: ConnectionPool) {
    this.req = db.request();
  }
  p(value: string | number | Date): string {
    const name = "p" + this.n++;
    this.req.input(name, value);
    return "@" + name;
  }
  query<T = Record<string, unknown>>(sql: string): Promise<IResult<T>> {
    return this.req.query<T>(sql);
  }
}

/** The su_program a role/filter combination is restricted to, or null. */
export function resolvedProgram(filters: Filters, user: SessionUser): string | null {
  if (user.program) return user.program;
  if (filters.project && filters.project !== "all") return filters.project;
  return null;
}

const AGE_RANGES: Record<string, [number, number]> = {
  "0–5": [0, 5],
  "6–17": [6, 17],
  "18–29": [18, 29],
};

/** AND-conditions for serviceuser_mstr (prefix e.g. "sm." or ""). */
export function suConditions(
  q: Q,
  filters: Filters,
  user: SessionUser,
  pfx = "sm.",
): string[] {
  const c: string[] = [];
  const program = resolvedProgram(filters, user);
  if (program) c.push(`LTRIM(RTRIM(${pfx}su_program)) = ${q.p(program)}`);
  if (filters.district && filters.district !== "all")
    c.push(`${pfx}su_district = ${q.p(filters.district)}`);
  if (filters.status === "Active")
    c.push(`${pfx}su_isActive = 1 AND (${pfx}su_discharged = 0 OR ${pfx}su_discharged IS NULL)`);
  if (filters.status === "Inactive") c.push(`${pfx}su_isActive = 0`);
  if (filters.gender && filters.gender !== "all") {
    const g = filters.gender;
    c.push(`(${pfx}su_sex = ${q.p(g)} OR ${pfx}su_sex = ${q.p(g[0])})`);
  }
  const ageExpr = `TRY_CAST(LEFT(${pfx}su_age, PATINDEX('%[^0-9]%', ${pfx}su_age + 'x') - 1) AS INT)`;
  if (filters.age && filters.age !== "all") {
    if (filters.age === "30+") c.push(`${ageExpr} >= 30`);
    else {
      const r = AGE_RANGES[filters.age];
      if (r) c.push(`${ageExpr} BETWEEN ${r[0]} AND ${r[1]}`);
    }
  }
  if (filters.support && filters.support !== "all")
    c.push(`${pfx}su_disability = ${q.p(filters.support)}`);
  if (user.details && filters.worker)
    c.push(
      `EXISTS (SELECT 1 FROM User_mstr uw WHERE uw.usr_id = ${pfx}su_owner AND uw.usr_name = ${q.p(filters.worker)})`,
    );
  return c;
}

export function whereFrom(conditions: string[]): string {
  return conditions.length ? "WHERE " + conditions.join(" AND ") : "";
}

// This DB's task_status vocabulary: Pending / Closed / Open / Cancelled.
// A completed/done session is "Closed"; not-done work is Pending or Open.
export const taskDone = (pfx = "t.") => `${pfx}task_status = 'Closed'`;
export const taskOpen = (pfx = "t.") => `${pfx}task_status IN ('Pending', 'Open')`;

/** Extra conditions for a beneficiary-list metric (start/end already bound). */
export function metricConditions(
  metric: string,
  start: string,
  end: string,
): string[] {
  switch (metric) {
    case "active":
      return [`sm.su_isActive = 1 AND (sm.su_discharged = 0 OR sm.su_discharged IS NULL)`];
    case "new":
      return [`sm.su_dateofadmission >= ${start} AND sm.su_dateofadmission < ${end}`];
    case "served":
      return [
        `EXISTS (SELECT 1 FROM task_mstr t WHERE t.task_serviceuser = sm.su_id AND ${taskDone()} AND t.task_date >= ${start} AND t.task_date < ${end})`,
      ];
    case "overdue":
      return [
        `EXISTS (SELECT 1 FROM task_mstr t WHERE t.task_serviceuser = sm.su_id AND ${taskOpen()} AND t.task_date < GETDATE())`,
      ];
    case "incomplete":
      return [`${completeExpr()} = 0`, `sm.su_isActive = 1`];
    default:
      return [];
  }
}

/** Mandatory-field completeness expression for a serviceuser row. */
export function completeExpr(pfx = "sm."): string {
  return `CASE WHEN ${pfx}su_name IS NULL OR ${pfx}su_dob IS NULL OR ${pfx}su_disability IS NULL OR ${pfx}su_village IS NULL THEN 0 ELSE 1 END`;
}

/** Reporting-officer small-group suppression threshold. */
export const SUPPRESS_BELOW = 5;

export function suppress(value: number, user: SessionUser): number | null {
  return !user.details && value > 0 && value < SUPPRESS_BELOW ? null : value;
}
