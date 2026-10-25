import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const division = searchParams.get("division") ?? "";

  try {
    const db = await getDb();
    let where = `WHERE YEAR(task_date) = ${year}`;
    if (division) where += ` AND task_division = '${division.replace(/'/g,"''")}'`;

    const [monthly, byWorker, byActivity, byDivision, attendance, missedSessions] = await Promise.all([
      db.request().query(`
        SELECT FORMAT(task_date,'yyyy-MM') AS month,
               COUNT(*) AS planned,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN task_status='Pending' AND task_date < GETDATE() THEN 1 ELSE 0 END) AS overdue,
               COUNT(DISTINCT task_serviceuser) AS beneficiaries_served
        FROM task_mstr
        WHERE task_date >= DATEADD(MONTH,-6,GETDATE())
        GROUP BY FORMAT(task_date,'yyyy-MM') ORDER BY month
      `),
      db.request().query(`
        SELECT TOP 20 task_owner AS worker,
               COUNT(*) AS total,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed,
               COUNT(DISTINCT task_serviceuser) AS beneficiaries
        FROM task_mstr ${where}
        GROUP BY task_owner ORDER BY completed DESC
      `),
      db.request().query(`
        SELECT task_activity AS activity,
               COUNT(*) AS total,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed
        FROM task_mstr ${where}
        GROUP BY task_activity ORDER BY total DESC
      `),
      db.request().query(`
        SELECT task_division AS division,
               COUNT(*) AS total,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed,
               COUNT(DISTINCT task_serviceuser) AS beneficiaries
        FROM task_mstr ${where}
        GROUP BY task_division ORDER BY total DESC
      `),
      // Attendance breakdown: completed=present, cancelled=absent, pending past=missed
      db.request().query(`
        SELECT
          SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS present,
          SUM(CASE WHEN task_status='Cancelled' THEN 1 ELSE 0 END) AS absent,
          SUM(CASE WHEN task_status='Pending' AND task_date < GETDATE() THEN 1 ELSE 0 END) AS missed,
          COUNT(*) AS total
        FROM task_mstr ${where}
      `),
      // Missed/cancelled sessions table
      db.request().query(`
        SELECT TOP 30
               sm.su_patientno, sm.su_name, sm.su_program,
               t.task_date, t.task_activity, t.task_status,
               t.task_owner, t.task_division
        FROM task_mstr t
        LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
        WHERE (t.task_status='Cancelled' OR (t.task_status='Pending' AND t.task_date < GETDATE()))
          AND YEAR(t.task_date) = ${year}
          ${division ? `AND t.task_division='${division.replace(/'/g,"''")}' ` : ""}
        ORDER BY t.task_date DESC
      `),
    ]);

    return NextResponse.json({
      monthly: monthly.recordset,
      byWorker: byWorker.recordset,
      byActivity: byActivity.recordset,
      byDivision: byDivision.recordset,
      attendance: attendance.recordset[0],
      missedSessions: missedSessions.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
