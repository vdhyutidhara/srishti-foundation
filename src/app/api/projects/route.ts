import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const program = searchParams.get("program") ?? "";
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const month = searchParams.get("month") ?? "";

  try {
    const db = await getDb();

    let atpWhere = `WHERE atp_year = '${year}'`;
    if (program) atpWhere += ` AND atp_division = '${program.replace(/'/g,"''")}'`;
    if (month) atpWhere += ` AND atp_month = '${month.replace(/'/g,"''")}'`;

    const [programs, atpSummary, beneficiariesByProgram, sessionsByProgram] = await Promise.all([
      // Distinct programs/divisions
      db.request().query(`
        SELECT DISTINCT su_division, su_program, COUNT(*) AS count
        FROM serviceuser_mstr
        WHERE su_isActive = 1
        GROUP BY su_division, su_program
        ORDER BY su_division
      `),
      // ATP target vs achieved by division
      db.request().query(`
        SELECT atp_division, atp_domain,
               SUM(TRY_CAST(atp_target AS FLOAT)) AS total_target,
               SUM(TRY_CAST(atp_achived AS FLOAT)) AS total_achieved,
               COUNT(*) AS plans
        FROM atp_mstr
        ${atpWhere}
        GROUP BY atp_division, atp_domain
        ORDER BY atp_division, atp_domain
      `),
      // Beneficiaries per program
      db.request().query(`
        SELECT su_division, su_program,
               COUNT(*) AS total,
               SUM(CASE WHEN su_isActive=1 AND (su_discharged=0 OR su_discharged IS NULL) THEN 1 ELSE 0 END) AS active,
               SUM(CASE WHEN su_discharged=1 OR su_isActive=0 THEN 1 ELSE 0 END) AS discharged
        FROM serviceuser_mstr
        GROUP BY su_division, su_program
        ORDER BY su_division
      `),
      // Sessions by division this year
      db.request().query(`
        SELECT t.task_division,
               COUNT(*) AS total_sessions,
               SUM(CASE WHEN task_status='Completed' THEN 1 ELSE 0 END) AS completed,
               SUM(CASE WHEN task_status='Pending' THEN 1 ELSE 0 END) AS pending,
               SUM(CASE WHEN task_status='Cancelled' THEN 1 ELSE 0 END) AS cancelled
        FROM task_mstr t
        WHERE YEAR(task_date) = ${year}
        GROUP BY t.task_division
        ORDER BY t.task_division
      `),
    ]);

    return NextResponse.json({
      programs: programs.recordset,
      atpSummary: atpSummary.recordset,
      beneficiariesByProgram: beneficiariesByProgram.recordset,
      sessionsByProgram: sessionsByProgram.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
