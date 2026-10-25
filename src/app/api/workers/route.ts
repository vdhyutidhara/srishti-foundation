import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const [caseload, activitySummary] = await Promise.all([
      // Worker caseload table: caseload, visits done, pending, overdue, last activity, status
      db.request().query(`
        SELECT
          t.task_owner AS worker,
          sm.su_program AS project,
          COUNT(DISTINCT t.task_serviceuser) AS caseload,
          SUM(CASE WHEN t.task_status='Completed' THEN 1 ELSE 0 END) AS visits_done,
          SUM(CASE WHEN t.task_status='Pending' AND t.task_date >= GETDATE() THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN t.task_status='Pending' AND t.task_date < GETDATE() THEN 1 ELSE 0 END) AS overdue_followups,
          MAX(CASE WHEN t.task_status='Completed' THEN t.task_date ELSE NULL END) AS last_activity,
          COUNT(*) AS total_tasks
        FROM task_mstr t
        LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        WHERE t.task_owner IS NOT NULL
          AND YEAR(t.task_date) = YEAR(GETDATE())
        GROUP BY t.task_owner, sm.su_program
        ORDER BY caseload DESC
      `),

      // Activity summary per worker across all time
      db.request().query(`
        SELECT TOP 20
          task_owner AS worker,
          COUNT(*) AS total,
          SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN task_status='Cancelled' THEN 1 ELSE 0 END) AS cancelled,
          SUM(CASE WHEN task_status='Pending' AND task_date < GETDATE() THEN 1 ELSE 0 END) AS overdue,
          MAX(task_date) AS last_task_date
        FROM task_mstr
        WHERE task_owner IS NOT NULL
          AND YEAR(task_date) = YEAR(GETDATE())
        GROUP BY task_owner
        ORDER BY total DESC
      `),
    ]);

    return NextResponse.json({
      caseload: caseload.recordset,
      activitySummary: activitySummary.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
