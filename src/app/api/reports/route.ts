import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";


function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "beneficiaries";
  const format = searchParams.get("format") ?? "csv";
  const program = searchParams.get("program") ?? "";
  const year = searchParams.get("year") ?? String(new Date().getFullYear());

  try {
    const db = await getDb();
    let rows: Record<string, unknown>[] = [];
    let filename = type;

    switch (type) {
      case "beneficiaries": {
        let where = "WHERE 1=1";
        if (program) where += ` AND su_program='${program.replace(/'/g,"''")}'`;
        const r = await db.request().query(`
          SELECT su_patientno, su_name, su_sex, su_age, su_dob,
                 su_disability, su_program, su_division, su_center,
                 su_village, su_block, su_district,
                 su_dateofadmission, su_dateofdischarge,
                 CASE WHEN su_isActive=1 THEN 'Active' ELSE 'Inactive' END AS status
          FROM serviceuser_mstr ${where}
          ORDER BY su_name
        `);
        rows = r.recordset;
        filename = "beneficiaries";
        break;
      }
      case "sessions": {
        let where = `WHERE YEAR(task_date)=${year}`;
        if (program) where += ` AND task_division='${program.replace(/'/g,"''")}'`;
        const r = await db.request().query(`
          SELECT sm.su_patientno, sm.su_name, sm.su_program,
                 t.task_date, t.task_activity, t.task_subactivity,
                 t.task_status, t.task_owner,
                 t.task_checkin_time, t.task_checkout_time
          FROM task_mstr t
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
          ${where}
          ORDER BY t.task_date DESC
        `);
        rows = r.recordset;
        filename = `sessions_${year}`;
        break;
      }
      case "treatments": {
        const r = await db.request().query(`
          SELECT sm.su_patientno, sm.su_name, sm.su_program,
                 tr.tr_goal, tr.tr_problem, tr.tr_cycle,
                 tr.tr_startdate, tr.tr_enddate,
                 tr.tr_target, tr.tr_achived, tr.tr_status, tr.tr_therapist
          FROM treatment_mstr tr
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = tr.tr_serviceuser
          ORDER BY sm.su_name, tr.tr_startdate DESC
        `);
        rows = r.recordset;
        filename = "treatment_goals";
        break;
      }
      case "assessments": {
        const r = await db.request().query(`
          SELECT sm.su_patientno, sm.su_name, sm.su_program,
                 te.trevl_evalno, te.trevl_assigndt, te.trevl_evaldt,
                 te.trevl_status, te.trevl_score
          FROM treatmentEvaluation_dtl te
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser
          ORDER BY te.trevl_assigndt DESC
        `);
        rows = r.recordset;
        filename = "assessments";
        break;
      }
      case "alerts": {
        const r = await db.request().query(`
          SELECT sm.su_name, sm.su_program,
                 t.task_date, t.task_activity, t.task_owner,
                 DATEDIFF(DAY, t.task_date, GETDATE()) AS days_overdue,
                 'Overdue Follow-up' AS alert_type
          FROM task_mstr t
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
          WHERE t.task_status = 'Pending' AND t.task_date < GETDATE()
          ORDER BY t.task_date ASC
        `);
        rows = r.recordset;
        filename = "overdue_alerts";
        break;
      }
      case "project-performance": {
        const r = await db.request().query(`
          SELECT sm.su_program,
                 COUNT(DISTINCT sm.su_id) AS enrolled,
                 SUM(CASE WHEN t.task_status='Completed' THEN 1 ELSE 0 END) AS sessions_completed,
                 SUM(CASE WHEN t.task_status='Pending' AND t.task_date<GETDATE() THEN 1 ELSE 0 END) AS sessions_overdue,
                 SUM(CASE WHEN tr.tr_status='Active' AND TRY_CAST(tr.tr_achived AS FLOAT)>=TRY_CAST(tr.tr_target AS FLOAT)*0.7 AND TRY_CAST(tr.tr_target AS FLOAT)>0 THEN 1 ELSE 0 END) AS goals_on_track
          FROM serviceuser_mstr sm
          LEFT JOIN task_mstr t ON t.task_serviceuser=sm.su_id AND YEAR(t.task_date)=${year}
          LEFT JOIN treatment_mstr tr ON tr.tr_serviceuser=sm.su_id
          WHERE sm.su_isActive=1
          GROUP BY sm.su_program
          ORDER BY enrolled DESC
        `);
        rows = r.recordset;
        filename = `project_performance_${year}`;
        break;
      }
      case "data-quality": {
        const r = await db.request().query(`
          SELECT su_patientno, su_name, su_program, su_division,
                 CASE WHEN su_dob IS NULL THEN 'Missing' ELSE 'OK' END AS dob,
                 CASE WHEN su_sex IS NULL OR su_sex='' THEN 'Missing' ELSE 'OK' END AS sex,
                 CASE WHEN su_disability IS NULL OR su_disability='' THEN 'Missing' ELSE 'OK' END AS disability,
                 CASE WHEN su_village IS NULL OR su_village='' THEN 'Missing' ELSE 'OK' END AS village,
                 CASE WHEN su_dateofadmission IS NULL THEN 'Missing' ELSE 'OK' END AS admission_date,
                 CASE WHEN su_owner IS NULL OR su_owner='' THEN 'Missing' ELSE 'OK' END AS assigned_worker
          FROM serviceuser_mstr
          WHERE su_isActive=1
          ORDER BY su_program, su_name
        `);
        rows = r.recordset;
        filename = "data_quality_report";
        break;
      }
      case "quarterly-outcomes": {
        const r = await db.request().query(`
          SELECT sm.su_program, sm.su_domain,
                 COUNT(*) AS total_goals,
                 SUM(CASE WHEN tr.tr_status='Closed' THEN 1 ELSE 0 END) AS goals_achieved,
                 SUM(CASE WHEN tr.tr_status='Active' AND TRY_CAST(tr.tr_achived AS FLOAT)>=TRY_CAST(tr.tr_target AS FLOAT)*0.7 AND TRY_CAST(tr.tr_target AS FLOAT)>0 THEN 1 ELSE 0 END) AS goals_on_track,
                 AVG(CASE WHEN TRY_CAST(tr.tr_target AS FLOAT)>0 THEN CAST(TRY_CAST(tr.tr_achived AS FLOAT)*100.0/TRY_CAST(tr.tr_target AS FLOAT) AS INT) ELSE NULL END) AS avg_achievement_pct
          FROM treatment_mstr tr
          LEFT JOIN serviceuser_mstr sm ON sm.su_id=tr.tr_serviceuser
          GROUP BY sm.su_program, sm.su_domain
          ORDER BY sm.su_program, sm.su_domain
        `);
        rows = r.recordset;
        filename = `quarterly_outcomes_${year}`;
        break;
      }
    }

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
