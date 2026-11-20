import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Q, completeExpr } from "@/lib/analytics";
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
function gender(v: unknown): string {
  const s = String(v ?? "").trim();
  if (/^f/i.test(s)) return "Female";
  if (/^m/i.test(s)) return "Male";
  return s || "Not recorded";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ message: "No session" }, { status: 401 });
  if (!user.details)
    return NextResponse.json(
      { message: "Your role cannot open individual profiles." },
      { status: 403 },
    );

  const { id } = await params;

  try {
    const db = await getDb();

    const profileQ = new Q(db as ConnectionPool);
    const pid = profileQ.p(id);
    const profile = await profileQ.query<Record<string, unknown>>(`
      SELECT su_id, su_patientno, su_name, su_sex, su_program, su_district,
             COALESCE(u.usr_name, sm.su_owner) AS su_owner,
             TRY_CAST(LEFT(su_age, PATINDEX('%[^0-9]%', su_age + 'x') - 1) AS INT) AS age,
             su_isActive, su_discharged, su_dateofadmission,
             ${completeExpr("sm.")} AS complete
      FROM serviceuser_mstr sm
      LEFT JOIN User_mstr u ON u.usr_id = sm.su_owner
      WHERE sm.su_id = ${pid}`);

    const row = profile.recordset[0];
    if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // Scope enforcement for programme-restricted roles.
    if (
      user.program &&
      String(row.su_program ?? "").toLowerCase() !== user.program.toLowerCase()
    )
      return NextResponse.json({ message: "Outside your scope." }, { status: 403 });

    const goalsQ = new Q(db as ConnectionPool);
    const goals = await goalsQ.query<Record<string, unknown>>(`
      SELECT tr_goal, tr_target, tr_achived
      FROM treatment_mstr WHERE tr_serviceuser = ${goalsQ.p(id)}
      ORDER BY tr_startdate DESC`);

    const evalQ = new Q(db as ConnectionPool);
    const evals = await evalQ.query<Record<string, unknown>>(`
      SELECT trevl_evalno, trevl_assigndt, trevl_evaldt, trevl_score
      FROM treatmentEvaluation_dtl WHERE trevl_serviceuser = ${evalQ.p(id)}
      ORDER BY COALESCE(trevl_evaldt, trevl_assigndt) ASC`);

    const taskQ = new Q(db as ConnectionPool);
    const tasks = await taskQ.query<Record<string, unknown>>(`
      SELECT TOP 40 task_id, task_date, task_activity, task_status
      FROM task_mstr WHERE task_serviceuser = ${taskQ.p(id)}
      ORDER BY task_date DESC`);

    const scores = evals.recordset.map((e) => num(e.trevl_score));
    const scoreTotal = Math.max(1, ...scores);

    const today = new Date().toISOString().slice(0, 10);
    const isOpen = (s: unknown) =>
      String(s) === "Pending" || String(s) === "Open";
    const pendingDates = tasks.recordset
      .filter((t) => isOpen(t.task_status))
      .map((t) => toISO(t.task_date))
      .filter((d) => d >= today)
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      id: String(row.su_id),
      name: String(row.su_name ?? "Unnamed record"),
      status:
        Number(row.su_isActive) === 1 && Number(row.su_discharged) !== 1
          ? "Active"
          : "Inactive",
      projects: [{ short: String(row.su_program ?? "—") }],
      age: num(row.age),
      gender: gender(row.su_sex),
      district: String(row.su_district ?? "—"),
      worker: String(row.su_owner ?? "Unassigned"),
      registeredAt: toISO(row.su_dateofadmission),
      nextReview: pendingDates[0] ?? "",
      complete: Number(row.complete) === 1,
      goals: goals.recordset.map((g) => ({
        name: String(g.tr_goal ?? "Goal"),
        total: Math.max(1, num(g.tr_target)),
        completed: num(g.tr_achived),
      })),
      assessments: evals.recordset.map((e) => ({
        date: toISO(e.trevl_evaldt ?? e.trevl_assigndt),
        score: num(e.trevl_score),
        total: scoreTotal,
        label: "Evaluation " + String(e.trevl_evalno ?? ""),
      })),
      followups: tasks.recordset
        .filter((t) => isOpen(t.task_status))
        .slice(0, 10)
        .map((t) => ({
          id: String(t.task_id),
          type: String(t.task_activity ?? "Follow-up"),
          due: toISO(t.task_date),
          status: "Open",
        })),
      services: tasks.recordset.map((t) => ({
        id: String(t.task_id),
        date: toISO(t.task_date),
        type: String(t.task_activity ?? "Session"),
        status:
          String(t.task_status) === "Closed"
            ? "Completed"
            : String(t.task_status ?? "—"),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message }, { status: 500 });
  }
}
