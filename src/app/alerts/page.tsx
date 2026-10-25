"use client";
import { useEffect, useState } from "react";

interface AlertsData {
  overdueFollowups: { task_id: string; task_date: string; task_activity: string; task_owner: string; su_name: string; su_program: string; days_overdue: number; last_contact: string | null }[];
  assessmentsDue: { trevl_id: string; trevl_assigndt: string; trevl_evalno: string; su_name: string; su_program: string; days_since_assigned: number }[];
  incompleteRecords: { su_id: string; su_name: string; su_patientno: string; su_program: string; su_division: string; missing_dob: number; missing_disability: number; missing_address: number; missing_admission: number }[];
  expiredTreatments: { tr_id: string; tr_goal: string; tr_program: string; tr_enddate: string; su_name: string; days_expired: number }[];
  referralsPending: { task_id: string; task_date: string; task_activity: string; task_owner: string; su_name: string; su_program: string; days_open: number }[];
  recentActivity: { aud_id: string; aud_table: string; aud_field: string; aud_oldvalue: string; aud_newvalue: string; aud_createdby: string; aud_date: string }[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"followups" | "referrals" | "assessments" | "records" | "treatments" | "activity">("followups");

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="content"><div className="alertbar">{error}</div></div>;
  if (!data) return <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>;

  const tabs: { key: typeof view; label: string; count: number; color: string }[] = [
    { key: "followups", label: "Overdue Follow-ups", count: data.overdueFollowups.length, color: "var(--crit)" },
    { key: "referrals", label: "Referrals Pending Closure", count: data.referralsPending.length, color: "var(--warn)" },
    { key: "assessments", label: "Assessments Due", count: data.assessmentsDue.length, color: "var(--warn)" },
    { key: "records", label: "Incomplete Records", count: data.incompleteRecords.length, color: "var(--warn)" },
    { key: "treatments", label: "Expired Treatments", count: data.expiredTreatments.length, color: "var(--serious)" },
    { key: "activity", label: "Recent Activity", count: data.recentActivity.length, color: "var(--accent)" },
  ];

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <div style={{ marginLeft: "auto" }}>
          <a href="/api/reports?type=alerts" className="btn btn-g btn-sm">⬇ Overdue CSV</a>
        </div>
      </div>

      <div className="content">
        <div className="kpi-row-sm">
          {tabs.slice(0, 4).map((t) => (
            <div key={t.key} className="kpi" style={{ cursor: "pointer", borderLeft: view === t.key ? `3px solid ${t.color}` : undefined }} onClick={() => setView(t.key)}>
              <div className="kpi-lbl">{t.label}</div>
              <div className="kpi-val" style={{ color: t.color }}>{t.count}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="tabs">
            {tabs.map((t) => (
              <div key={t.key} className={`tab${view === t.key ? " on" : ""}`} onClick={() => setView(t.key)}>
                {t.label}{t.count > 0 && <span style={{ background: t.color, color: "#fff", borderRadius: 8, padding: "1px 5px", fontSize: 9, marginLeft: 4 }}>{t.count}</span>}
              </div>
            ))}
          </div>

          {view === "followups" && (
            <div className="tbl-wrap">
              {data.overdueFollowups.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No overdue follow-ups</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Beneficiary</th><th>Program</th><th>Due Date</th><th>Activity</th><th>Worker</th><th>Last Contact</th><th>Days Overdue</th><th>Action</th></tr></thead>
                  <tbody>
                    {data.overdueFollowups.map((f) => (
                      <tr key={f.task_id}>
                        <td className="name">{f.su_name ?? "—"}</td>
                        <td>{f.su_program ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(f.task_date)}</td>
                        <td>{f.task_activity ?? "—"}</td>
                        <td>{f.task_owner ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap", color: f.last_contact ? "var(--ink)" : "var(--crit)" }}>{fmtDate(f.last_contact)}</td>
                        <td><span style={{ color: f.days_overdue > 30 ? "var(--crit)" : "var(--warn)", fontWeight: 700 }}>{f.days_overdue}d</span></td>
                        <td><button className="btn btn-g btn-sm" onClick={() => alert("Schedule feature coming soon")}>Schedule</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "referrals" && (
            <div className="tbl-wrap">
              {data.referralsPending.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No pending referrals</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Beneficiary</th><th>Program</th><th>Referral Date</th><th>Type</th><th>Worker</th><th>Days Open</th><th>Action</th></tr></thead>
                  <tbody>
                    {data.referralsPending.map((r) => (
                      <tr key={r.task_id}>
                        <td className="name">{r.su_name ?? "—"}</td>
                        <td>{r.su_program ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.task_date)}</td>
                        <td>{r.task_activity ?? "Referral"}</td>
                        <td>{r.task_owner ?? "—"}</td>
                        <td><span style={{ color: r.days_open > 30 ? "var(--crit)" : "var(--warn)", fontWeight: 700 }}>{r.days_open}d</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-g btn-sm" onClick={() => alert("Mark closed coming soon")}>Close</button>
                            <button className="btn btn-g btn-sm" onClick={() => alert("Schedule coming soon")}>Schedule</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "assessments" && (
            <div className="tbl-wrap">
              {data.assessmentsDue.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No overdue assessments</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Beneficiary</th><th>Program</th><th>Eval No</th><th>Assigned</th><th>Days Pending</th><th>Action</th></tr></thead>
                  <tbody>
                    {data.assessmentsDue.map((a) => (
                      <tr key={a.trevl_id}>
                        <td className="name">{a.su_name ?? "—"}</td>
                        <td>{a.su_program ?? "—"}</td>
                        <td>{a.trevl_evalno ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(a.trevl_assigndt)}</td>
                        <td><span style={{ color: a.days_since_assigned > 60 ? "var(--crit)" : "var(--warn)", fontWeight: 700 }}>{a.days_since_assigned}d</span></td>
                        <td><button className="btn btn-g btn-sm" onClick={() => alert("Schedule coming soon")}>Schedule</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "records" && (
            <div className="tbl-wrap">
              {data.incompleteRecords.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ All records complete</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Patient No</th><th>Name</th><th>Program</th><th>Division</th><th>Missing Fields</th></tr></thead>
                  <tbody>
                    {data.incompleteRecords.map((r) => {
                      const missing = [r.missing_dob && "DOB", r.missing_disability && "Disability", r.missing_address && "Village", r.missing_admission && "Admission Date"].filter(Boolean).join(", ");
                      return (
                        <tr key={r.su_id}>
                          <td>{r.su_patientno ?? "—"}</td>
                          <td className="name">{r.su_name}</td>
                          <td>{r.su_program ?? "—"}</td>
                          <td>{r.su_division ?? "—"}</td>
                          <td><span className="badge badge-y">{missing}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "treatments" && (
            <div className="tbl-wrap">
              {data.expiredTreatments.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No expired active treatments</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Beneficiary</th><th>Goal</th><th>Program</th><th>End Date</th><th>Days Expired</th></tr></thead>
                  <tbody>
                    {data.expiredTreatments.map((t) => (
                      <tr key={t.tr_id}>
                        <td className="name">{t.su_name ?? "—"}</td>
                        <td>{t.tr_goal ?? "—"}</td>
                        <td>{t.tr_program ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.tr_enddate)}</td>
                        <td><span style={{ color: "var(--serious)", fontWeight: 700 }}>{t.days_expired}d</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "activity" && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Date</th><th>Table</th><th>Field</th><th>Old Value</th><th>New Value</th><th>By</th></tr></thead>
                <tbody>
                  {data.recentActivity.map((a) => (
                    <tr key={a.aud_id}>
                      <td style={{ whiteSpace: "nowrap" }}>{a.aud_date}</td>
                      <td className="name">{a.aud_table ?? "—"}</td>
                      <td>{a.aud_field ?? "—"}</td>
                      <td style={{ color: "var(--crit)" }}>{a.aud_oldvalue ?? "—"}</td>
                      <td style={{ color: "var(--good)" }}>{a.aud_newvalue ?? "—"}</td>
                      <td>{a.aud_createdby ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
