import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const [domainProgress, milestoneStatus, assessmentsDue, recentEvals, kpis] = await Promise.all([
      // Goal progress by domain (su_domain or tr_problem as proxy for domain)
      db.request().query(`
        SELECT su_domain AS domain,
               COUNT(*) AS total_goals,
               AVG(CASE WHEN TRY_CAST(tr_target AS FLOAT) > 0
                   THEN CAST(TRY_CAST(tr_achived AS FLOAT) * 100.0 / TRY_CAST(tr_target AS FLOAT) AS INT)
                   ELSE NULL END) AS avg_pct
        FROM treatment_mstr tr
        LEFT JOIN serviceuser_mstr sm ON sm.su_id = tr.tr_serviceuser
        WHERE tr.tr_status = 'Active' AND sm.su_domain IS NOT NULL
        GROUP BY su_domain
        ORDER BY avg_pct DESC
      `),

      // Milestone status
      db.request().query(`
        SELECT
          SUM(CASE WHEN tr_status='Closed' THEN 1 ELSE 0 END) AS achieved,
          SUM(CASE WHEN tr_status='Active' AND TRY_CAST(tr_achived AS FLOAT) > 0 THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN tr_status='Active' AND (tr_achived IS NULL OR tr_achived='0') THEN 1 ELSE 0 END) AS not_started,
          SUM(CASE WHEN tr_status='Active' AND tr_enddate < GETDATE() THEN 1 ELSE 0 END) AS overdue_review
        FROM treatment_mstr
      `),

      // Assessments due (overdue > 30 days)
      db.request().query(`
        SELECT TOP 30
               sm.su_patientno, sm.su_name, sm.su_program,
               te.trevl_evalno, te.trevl_assigndt,
               DATEDIFF(DAY, te.trevl_assigndt, GETDATE()) AS days_overdue
        FROM treatmentEvaluation_dtl te
        LEFT JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser
        WHERE te.trevl_status = 'Assigned' AND te.trevl_assigndt < DATEADD(DAY,-30,GETDATE())
        ORDER BY te.trevl_assigndt ASC
      `),

      // Recent evaluations
      db.request().query(`
        SELECT TOP 20
               te.trevl_id, te.trevl_evalno, te.trevl_evaldt,
               te.trevl_status, te.trevl_score,
               sm.su_name, sm.su_program
        FROM treatmentEvaluation_dtl te
        LEFT JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser
        WHERE te.trevl_evaldt IS NOT NULL
        ORDER BY te.trevl_evaldt DESC
      `),

      // Summary KPIs
      db.request().query(`
        SELECT
          (SELECT COUNT(*) FROM form_dtl WHERE form_status='Completed') AS baselines_completed,
          (SELECT COUNT(*) FROM treatmentEvaluation_dtl WHERE trevl_status='Assigned' AND trevl_assigndt < DATEADD(DAY,-30,GETDATE())) AS reassessments_due,
          (SELECT COUNT(*) FROM treatment_mstr WHERE tr_status='Active' AND TRY_CAST(tr_achived AS FLOAT) >= TRY_CAST(tr_target AS FLOAT)*0.7 AND TRY_CAST(tr_target AS FLOAT)>0) AS goals_on_track,
          (SELECT COUNT(*) FROM treatment_mstr WHERE tr_status='Closed') AS milestones_achieved
      `),
    ]);

    return NextResponse.json({
      domainProgress: domainProgress.recordset,
      milestoneStatus: milestoneStatus.recordset[0],
      assessmentsDue: assessmentsDue.recordset,
      recentEvals: recentEvals.recordset,
      kpis: kpis.recordset[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
