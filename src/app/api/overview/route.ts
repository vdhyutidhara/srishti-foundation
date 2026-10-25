import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";


function periodSql(period: string) {
  switch (period) {
    case "quarter": return "DATEADD(MONTH,-3,GETDATE())";
    case "year":    return "DATEADD(YEAR,-1,GETDATE())";
    default:        return "DATEADD(MONTH,-1,GETDATE())";
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const district = searchParams.get("district") ?? "";

  try {
    const db = await getDb();
    const since = periodSql(period);
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const distWhere = district ? `AND su_district='${district.replace(/'/g,"''")}' ` : "";

    const [overview, projectPerf, sessionTrend, alerts, outcomes, recentActivity] = await Promise.all([
      // KPI cards
      db.request().query(`
        SELECT
          COUNT(*) AS total_registered,
          SUM(CASE WHEN su_isActive=1 AND (su_discharged=0 OR su_discharged IS NULL) THEN 1 ELSE 0 END) AS active_beneficiaries,
          SUM(CASE WHEN su_dateofadmission >= ${since} THEN 1 ELSE 0 END) AS new_this_period,
          (SELECT COUNT(DISTINCT task_serviceuser) FROM task_mstr t
           INNER JOIN serviceuser_mstr s2 ON s2.su_id=t.task_serviceuser
           WHERE t.task_date >= ${since} AND t.task_status='Completed' ${district ? `AND s2.su_district='${district.replace(/'/g,"''")}' ` : ""}) AS served_this_period,
          (SELECT COUNT(*) FROM task_mstr WHERE task_status='Pending' AND task_date < GETDATE()) AS followups_overdue,
          (SELECT COUNT(*) FROM serviceuser_mstr WHERE (su_name IS NULL OR su_dob IS NULL OR su_disability IS NULL OR su_village IS NULL) AND su_isActive=1 ${distWhere}) AS incomplete_records
        FROM serviceuser_mstr
        WHERE 1=1 ${distWhere}
      `),

      // Project performance — all 6 named projects target vs achieved from ATP
      db.request().query(`
        SELECT atp_division AS project,
               SUM(TRY_CAST(atp_target AS FLOAT)) AS target,
               SUM(TRY_CAST(atp_achived AS FLOAT)) AS achieved,
               COUNT(DISTINCT atp_serviceuser) AS beneficiaries
        FROM atp_mstr
        WHERE atp_year = '${now.getFullYear()}'
        GROUP BY atp_division
        ORDER BY atp_division
      `),

      // Sessions trend last 6 months — planned (all) vs completed
      db.request().query(`
        SELECT FORMAT(task_date,'yyyy-MM') AS month,
               COUNT(*) AS planned,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed
        FROM task_mstr
        WHERE task_date >= DATEADD(MONTH,-6,GETDATE())
        GROUP BY FORMAT(task_date,'yyyy-MM')
        ORDER BY month
      `),

      // Alert counts
      db.request().query(`
        SELECT
          (SELECT COUNT(*) FROM task_mstr WHERE task_status='Pending' AND task_date < GETDATE()) AS overdue_tasks,
          (SELECT COUNT(*) FROM treatmentEvaluation_dtl WHERE trevl_status='Assigned' AND trevl_assigndt < DATEADD(DAY,-30,GETDATE())) AS assessments_overdue,
          (SELECT COUNT(*) FROM serviceuser_mstr WHERE (su_name IS NULL OR su_dob IS NULL OR su_disability IS NULL) AND su_isActive=1) AS incomplete_records,
          (SELECT COUNT(*) FROM treatment_mstr WHERE tr_status='Active' AND tr_enddate < GETDATE()) AS expired_treatments
      `),

      // Outcomes distribution — treatment status breakdown
      db.request().query(`
        SELECT tr_status AS status, COUNT(*) AS cnt
        FROM treatment_mstr
        WHERE tr_serviceuser IN (SELECT su_id FROM serviceuser_mstr WHERE su_isActive=1 ${distWhere})
        GROUP BY tr_status
      `),

      // Recent activity from audit trail
      db.request().query(`
        SELECT TOP 10
               aud_table, aud_field, aud_newvalue, aud_createdby,
               FORMAT(aud_createddt,'yyyy-MM-dd HH:mm') AS aud_date
        FROM audit_trail
        ORDER BY aud_createddt DESC
      `),
    ]);

    return NextResponse.json({
      kpis: overview.recordset[0],
      projectPerf: projectPerf.recordset,
      sessionTrend: sessionTrend.recordset,
      alertCounts: alerts.recordset[0],
      outcomes: outcomes.recordset,
      recentActivity: recentActivity.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
