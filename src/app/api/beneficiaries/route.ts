import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const program = searchParams.get("program") ?? "";
  const status = searchParams.get("status") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const age = searchParams.get("age") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  try {
    const db = await getDb();

    let where = "WHERE 1=1";
    if (search) where += ` AND (sm.su_name LIKE '%${search.replace(/'/g,"''")}%' OR sm.su_patientno LIKE '%${search.replace(/'/g,"''")}%')`;
    if (program) where += ` AND sm.su_program = '${program.replace(/'/g,"''")}'`;
    if (status === "active") where += ` AND sm.su_isActive=1 AND (sm.su_discharged=0 OR sm.su_discharged IS NULL)`;
    if (status === "inactive") where += ` AND sm.su_isActive=0`;
    if (status === "exited") where += ` AND sm.su_discharged=1`;
    if (gender) where += ` AND sm.su_sex='${gender.replace(/'/g,"''")}' `;
    // su_age is nvarchar and may contain "5 years" — extract leading digits first
    const ageExpr = `TRY_CAST(LEFT(sm.su_age, PATINDEX('%[^0-9]%', sm.su_age + 'x') - 1) AS INT)`;
    if (age === "0-5")  where += ` AND ${ageExpr} BETWEEN 0 AND 5`;
    if (age === "6-12") where += ` AND ${ageExpr} BETWEEN 6 AND 12`;
    if (age === "13-18") where += ` AND ${ageExpr} BETWEEN 13 AND 18`;
    if (age === "18+") where += ` AND ${ageExpr} > 18`;

    const [rows, total, programs] = await Promise.all([
      db.request().query(`
        SELECT sm.su_id, sm.su_patientno, sm.su_name, sm.su_sex,
               TRY_CAST(LEFT(sm.su_age, PATINDEX('%[^0-9]%', sm.su_age + 'x') - 1) AS INT) AS su_age,
               sm.su_disability, sm.su_program, sm.su_division, sm.su_center,
               sm.su_village, sm.su_block, sm.su_district,
               sm.su_dateofadmission, sm.su_isActive, sm.su_discharged,
               sm.su_status, sm.su_owner,
               (SELECT MAX(t.task_date) FROM task_mstr t WHERE t.task_serviceuser=sm.su_id AND t.task_status='Completed') AS last_service,
               (SELECT TOP 1 t2.task_activity FROM task_mstr t2 WHERE t2.task_serviceuser=sm.su_id AND t2.task_status='Pending' AND t2.task_date >= GETDATE() ORDER BY t2.task_date ASC) AS next_action
        FROM serviceuser_mstr sm
        ${where}
        ORDER BY sm.su_name
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `),
      db.request().query(`SELECT COUNT(*) AS cnt FROM serviceuser_mstr sm ${where}`),
      db.request().query(`SELECT DISTINCT su_program FROM serviceuser_mstr WHERE su_program IS NOT NULL ORDER BY su_program`),
    ]);

    return NextResponse.json({
      data: rows.recordset,
      total: total.recordset[0].cnt,
      page,
      programs: programs.recordset.map((r: { su_program: string }) => r.su_program),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
