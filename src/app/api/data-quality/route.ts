import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const [kpis, missingFields, duplicates, outdatedContacts, inconsistentDates, fieldCoverage] = await Promise.all([
      // KPI summary
      db.request().query(`
        SELECT
          (SELECT COUNT(*) FROM serviceuser_mstr WHERE su_isActive=1 AND (su_dob IS NULL OR su_disability IS NULL OR su_village IS NULL OR su_dateofadmission IS NULL)) AS missing_fields,
          (SELECT COUNT(*) FROM (SELECT su_name, COUNT(*) AS c FROM serviceuser_mstr WHERE su_isActive=1 GROUP BY su_name HAVING COUNT(*)>1) d) AS duplicates,
          (SELECT COUNT(*) FROM serviceuser_mstr WHERE su_isActive=1 AND DATEDIFF(MONTH, su_dateofadmission, GETDATE()) > 24 AND (SELECT MAX(task_date) FROM task_mstr WHERE task_serviceuser=su_id) IS NULL) AS outdated_contacts,
          (SELECT COUNT(*) FROM serviceuser_mstr WHERE su_isActive=1 AND su_dob IS NOT NULL AND su_dateofadmission IS NOT NULL AND su_dob > su_dateofadmission) AS inconsistent_dates
      `),

      // Records with missing fields (top 50)
      db.request().query(`
        SELECT TOP 50
               su_id, su_name, su_patientno, su_program, su_division,
               CASE WHEN su_dob IS NULL THEN 1 ELSE 0 END AS no_dob,
               CASE WHEN su_sex IS NULL OR su_sex='' THEN 1 ELSE 0 END AS no_sex,
               CASE WHEN su_disability IS NULL OR su_disability='' THEN 1 ELSE 0 END AS no_disability,
               CASE WHEN su_village IS NULL OR su_village='' THEN 1 ELSE 0 END AS no_village,
               CASE WHEN su_dateofadmission IS NULL THEN 1 ELSE 0 END AS no_admission,
               CASE WHEN su_owner IS NULL OR su_owner='' THEN 1 ELSE 0 END AS no_worker
        FROM serviceuser_mstr
        WHERE su_isActive=1
          AND (su_dob IS NULL OR su_sex IS NULL OR su_sex='' OR su_disability IS NULL OR su_disability='' OR su_village IS NULL OR su_dateofadmission IS NULL OR su_owner IS NULL)
        ORDER BY su_name
      `),

      // Potential duplicates by name
      db.request().query(`
        SELECT TOP 20
               su_name, COUNT(*) AS record_count,
               MIN(su_patientno) AS sample_id,
               MIN(su_program) AS sample_program,
               MIN(CAST(su_dateofadmission AS VARCHAR(20))) AS min_admission
        FROM serviceuser_mstr
        WHERE su_isActive=1
        GROUP BY su_name
        HAVING COUNT(*) > 1
        ORDER BY record_count DESC
      `),

      // Beneficiaries with no recent contact (>6 months, still active)
      db.request().query(`
        SELECT TOP 30
               sm.su_id, sm.su_name, sm.su_patientno, sm.su_program,
               MAX(t.task_date) AS last_session,
               DATEDIFF(DAY, MAX(t.task_date), GETDATE()) AS days_since_contact
        FROM serviceuser_mstr sm
        LEFT JOIN task_mstr t ON t.task_serviceuser = sm.su_id AND t.task_status='Completed'
        WHERE sm.su_isActive=1
        GROUP BY sm.su_id, sm.su_name, sm.su_patientno, sm.su_program
        HAVING MAX(t.task_date) IS NULL OR MAX(t.task_date) < DATEADD(MONTH,-6,GETDATE())
        ORDER BY days_since_contact DESC
      `),

      // Records with inconsistent dates (DOB after admission)
      db.request().query(`
        SELECT TOP 20
               su_id, su_name, su_patientno, su_program,
               FORMAT(su_dob,'dd MMM yyyy') AS dob,
               FORMAT(su_dateofadmission,'dd MMM yyyy') AS admission
        FROM serviceuser_mstr
        WHERE su_isActive=1 AND su_dob IS NOT NULL AND su_dateofadmission IS NOT NULL
          AND su_dob > su_dateofadmission
        ORDER BY su_name
      `),

      // Field coverage % by program
      db.request().query(`
        SELECT su_program,
               COUNT(*) AS total,
               SUM(CASE WHEN su_dob IS NOT NULL THEN 1 ELSE 0 END)*100/COUNT(*) AS dob_pct,
               SUM(CASE WHEN su_sex IS NOT NULL AND su_sex<>'' THEN 1 ELSE 0 END)*100/COUNT(*) AS sex_pct,
               SUM(CASE WHEN su_disability IS NOT NULL AND su_disability<>'' THEN 1 ELSE 0 END)*100/COUNT(*) AS disability_pct,
               SUM(CASE WHEN su_village IS NOT NULL AND su_village<>'' THEN 1 ELSE 0 END)*100/COUNT(*) AS village_pct
        FROM serviceuser_mstr
        WHERE su_isActive=1
        GROUP BY su_program
        ORDER BY total DESC
      `),
    ]);

    return NextResponse.json({
      kpis: kpis.recordset[0],
      missingFields: missingFields.recordset,
      duplicates: duplicates.recordset,
      outdatedContacts: outdatedContacts.recordset,
      inconsistentDates: inconsistentDates.recordset,
      fieldCoverage: fieldCoverage.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
