import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getDb();

    const [overdueFollowups, assessmentsDue, incompleteRecords, expiredTreatments, referralsPending, recentActivity] =
      await Promise.all([
        // Overdue tasks (pending past due date) with last contact
        db.request().query(`
          SELECT TOP 30
                 t.task_id, t.task_date, t.task_activity, t.task_owner,
                 sm.su_name, sm.su_program,
                 DATEDIFF(DAY, t.task_date, GETDATE()) AS days_overdue,
                 (SELECT MAX(t2.task_date)
                  FROM task_mstr t2
                  WHERE t2.task_serviceuser = t.task_serviceuser
                    AND t2.task_status = 'Completed') AS last_contact
          FROM task_mstr t
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
          WHERE t.task_status = 'Pending' AND t.task_date < GETDATE()
          ORDER BY t.task_date ASC
        `),
        // Assessments overdue
        db.request().query(`
          SELECT TOP 30
                 te.trevl_id, te.trevl_assigndt, te.trevl_evalno,
                 sm.su_name, sm.su_program,
                 DATEDIFF(DAY, te.trevl_assigndt, GETDATE()) AS days_since_assigned
          FROM treatmentEvaluation_dtl te
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = te.trevl_serviceuser
          WHERE te.trevl_status = 'Assigned' AND te.trevl_assigndt < DATEADD(DAY,-30,GETDATE())
          ORDER BY te.trevl_assigndt ASC
        `),
        // Incomplete beneficiary records
        db.request().query(`
          SELECT TOP 30
                 su_id, su_name, su_patientno, su_program, su_division,
                 CASE WHEN su_dob IS NULL THEN 1 ELSE 0 END AS missing_dob,
                 CASE WHEN su_disability IS NULL THEN 1 ELSE 0 END AS missing_disability,
                 CASE WHEN su_village IS NULL THEN 1 ELSE 0 END AS missing_address,
                 CASE WHEN su_dateofadmission IS NULL THEN 1 ELSE 0 END AS missing_admission
          FROM serviceuser_mstr
          WHERE su_isActive = 1
            AND (su_dob IS NULL OR su_disability IS NULL OR su_village IS NULL OR su_dateofadmission IS NULL)
          ORDER BY su_name
        `),
        // Expired treatments still Active
        db.request().query(`
          SELECT TOP 30
                 tr.tr_id, tr.tr_goal, tr.tr_program, tr.tr_enddate,
                 sm.su_name,
                 DATEDIFF(DAY, tr.tr_enddate, GETDATE()) AS days_expired
          FROM treatment_mstr tr
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = tr.tr_serviceuser
          WHERE tr.tr_status = 'Active' AND tr.tr_enddate < GETDATE()
          ORDER BY tr.tr_enddate ASC
        `),
        // Referrals pending closure (tasks with 'refer' in activity, still pending)
        db.request().query(`
          SELECT TOP 30
                 t.task_id, t.task_date, t.task_activity, t.task_owner,
                 sm.su_name, sm.su_program,
                 DATEDIFF(DAY, t.task_date, GETDATE()) AS days_open
          FROM task_mstr t
          LEFT JOIN serviceuser_mstr sm ON sm.su_id = t.task_serviceuser
          WHERE t.task_status = 'Pending'
            AND (LOWER(t.task_activity) LIKE '%refer%' OR LOWER(t.task_activity) LIKE '%referral%')
          ORDER BY t.task_date ASC
        `),
        // Recent activity (audit trail)
        db.request().query(`
          SELECT TOP 20
                 aud_id, aud_table, aud_field,
                 aud_oldvalue, aud_newvalue, aud_createdby,
                 FORMAT(aud_createddt, 'yyyy-MM-dd HH:mm') AS aud_date
          FROM audit_trail
          ORDER BY aud_createddt DESC
        `),
      ]);

    return NextResponse.json({
      overdueFollowups: overdueFollowups.recordset,
      assessmentsDue: assessmentsDue.recordset,
      incompleteRecords: incompleteRecords.recordset,
      expiredTreatments: expiredTreatments.recordset,
      referralsPending: referralsPending.recordset,
      recentActivity: recentActivity.recordset,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
