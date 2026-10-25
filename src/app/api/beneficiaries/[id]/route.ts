import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getDb();
    const safeId = id.replace(/'/g, "''");

    const [profile, treatments, tasks, assessments] = await Promise.all([
      db.request().query(`
        SELECT su_id, su_patientno, su_name, su_sex, su_dob,
               TRY_CAST(LEFT(su_age, PATINDEX('%[^0-9]%', su_age + 'x') - 1) AS INT) AS su_age,
               su_disability, su_program, su_division, su_center,
               su_village, su_block, su_panchayat, su_district,
               su_dateofadmission, su_dateofdischarge, su_isActive,
               su_discharged, su_status, su_owner, su_mother_name, su_father_name,
               su_address1, su_postalcode
        FROM serviceuser_mstr WHERE su_id = '${safeId}'
      `),
      db.request().query(`
        SELECT tr_id, tr_goal, tr_problem, tr_status, tr_cycle,
               tr_startdate, tr_enddate, tr_achived, tr_target, tr_therapist, tr_program
        FROM treatment_mstr WHERE tr_serviceuser = '${safeId}'
        ORDER BY tr_startdate DESC
      `),
      db.request().query(`
        SELECT TOP 20 task_id, task_date, task_activity, task_subactivity,
               task_status, task_owner, task_checkin_time, task_checkout_time
        FROM task_mstr WHERE task_serviceuser = '${safeId}'
        ORDER BY task_date DESC
      `),
      db.request().query(`
        SELECT trevl_id, trevl_evalno, trevl_assigndt, trevl_evaldt,
               trevl_status, trevl_score
        FROM treatmentEvaluation_dtl WHERE trevl_serviceuser = '${safeId}'
        ORDER BY trevl_assigndt DESC
      `),
    ]);

    if (!profile.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: profile.recordset[0],
      treatments: treatments.recordset,
      tasks: tasks.recordset,
      assessments: assessments.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
