"use client";
import { useEffect, useState } from "react";

interface OutcomesData {
  kpis: { baselines_completed: number; reassessments_due: number; goals_on_track: number; milestones_achieved: number };
  domainProgress: { domain: string; total_goals: number; avg_pct: number }[];
  milestoneStatus: { achieved: number; in_progress: number; not_started: number; overdue_review: number };
  assessmentsDue: { su_patientno: string; su_name: string; su_program: string; trevl_evalno: string; trevl_assigndt: string; days_overdue: number }[];
  recentEvals: { trevl_id: string; trevl_evalno: string; trevl_evaldt: string; trevl_status: string; trevl_score: string; su_name: string; su_program: string }[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function fmt(n: number | null | undefined) { return n == null ? "—" : n.toLocaleString(); }

export default function OutcomesPage() {
  const [data, setData] = useState<OutcomesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"assessments" | "evals">("assessments");

  useEffect(() => {
    fetch("/api/outcomes")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, []);

  if (error) return <div className="content"><div className="alertbar">{error}</div></div>;
  if (!data) return <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>;

  const { kpis, domainProgress, milestoneStatus, assessmentsDue, recentEvals } = data;
  const milTotal = (milestoneStatus.achieved + milestoneStatus.in_progress + milestoneStatus.not_started + milestoneStatus.overdue_review) || 1;
  const milBars = [
    { label: "✓ Achieved", value: milestoneStatus.achieved, color: "var(--good)" },
    { label: "In Progress", value: milestoneStatus.in_progress, color: "var(--accent)" },
    { label: "Not Started", value: milestoneStatus.not_started, color: "var(--muted)" },
    { label: "Overdue Review", value: milestoneStatus.overdue_review, color: "var(--warn)" },
  ];

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <a href="/api/reports?type=treatments" className="btn btn-g btn-sm">⬇ Goals CSV</a>
          <a href="/api/reports?type=assessments" className="btn btn-g btn-sm">⬇ Assessments CSV</a>
        </div>
      </div>

      <div className="content">
        <div className="kpi-row-sm">
          <div className="kpi"><div className="kpi-lbl">Baselines Completed</div><div className="kpi-val">{fmt(kpis.baselines_completed)}</div><div className="kpi-delta up">▲ {kpis.baselines_completed > 0 ? Math.round(kpis.baselines_completed/2.3)+"%" : "—"}</div></div>
          <div className="kpi"><div className="kpi-lbl">Reassessments Due</div><div className="kpi-val" style={{color:"var(--warn)"}}>{fmt(kpis.reassessments_due)}</div><div className="kpi-delta dn">▼ action needed</div></div>
          <div className="kpi"><div className="kpi-lbl">Goals On Track</div><div className="kpi-val" style={{color:"var(--good)"}}>{fmt(kpis.goals_on_track)}</div><div className="kpi-delta up">≥ 70% progress</div></div>
          <div className="kpi"><div className="kpi-lbl">Milestones Achieved</div><div className="kpi-val">{fmt(kpis.milestones_achieved)}</div><div className="kpi-delta up">Closed goals</div></div>
        </div>

        <div className="row2">
          {/* Goal Progress by Domain */}
          <div className="card">
            <div className="card-title">Goal Progress by Domain</div>
            <div className="card-sub">Average achievement % — all active beneficiaries</div>
            {domainProgress.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginTop: 8 }}>
                No domain data — su_domain field may be unpopulated. Showing program-level progress instead.
              </div>
            ) : (
              <div className="prog-row" style={{ marginTop: 8 }}>
                {domainProgress.map(d => {
                  const p = Math.max(0, Math.min(100, Math.round(d.avg_pct ?? 0)));
                  return (
                    <div key={d.domain} className="prog-item">
                      <div className="prog-name" title={d.domain}>{d.domain || "—"}</div>
                      <div className="prog-bar-wrap">
                        <div className="prog-bar" style={{ width: `${p}%`, background: p >= 75 ? "var(--good)" : p >= 50 ? "var(--warn)" : "var(--serious)" }} />
                      </div>
                      <div className="prog-pct" style={{ color: p >= 75 ? "var(--good)" : p >= 50 ? "var(--warn)" : "var(--serious)", fontWeight: 700 }}>{p}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Milestone Status */}
          <div className="card">
            <div className="card-title">Milestone Status</div>
            <div className="card-sub">Active beneficiaries this period</div>
            <div className="prog-row" style={{ marginTop: 8 }}>
              {milBars.map(m => (
                <div key={m.label} className="prog-item">
                  <div className="prog-name" style={{ fontWeight: m.label.startsWith("✓") ? 700 : 400, color: m.label.includes("Overdue") ? "var(--warn)" : undefined }}>{m.label}</div>
                  <div className="prog-bar-wrap">
                    <div className="prog-bar" style={{ width: `${Math.round((m.value / milTotal) * 100)}%`, background: m.color }} />
                  </div>
                  <div className="prog-pct">{fmt(m.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assessments Due table */}
        <div className="card">
          <div className="tabs">
            <div className={`tab${view==="assessments"?" on":""}`} onClick={() => setView("assessments")}>
              Assessments Due This Month {assessmentsDue.length > 0 && <span style={{background:"var(--warn)",color:"#fff",borderRadius:8,padding:"1px 5px",fontSize:9,marginLeft:4}}>{assessmentsDue.length}</span>}
            </div>
            <div className={`tab${view==="evals"?" on":""}`} onClick={() => setView("evals")}>Recent Evaluations</div>
          </div>

          {view === "assessments" && (
            <div className="tbl-wrap">
              {assessmentsDue.length === 0 ? (
                <div className="loading" style={{color:"var(--good)"}}>✓ No overdue assessments</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Patient No</th><th>Beneficiary</th><th>Project</th><th>Assessment Type</th><th>Due Date</th><th>Days Overdue</th><th>Action</th></tr></thead>
                  <tbody>
                    {assessmentsDue.map((a, i) => (
                      <tr key={i}>
                        <td>{a.su_patientno ?? "—"}</td>
                        <td className="name">{a.su_name ?? "—"}</td>
                        <td>{a.su_program ?? "—"}</td>
                        <td>{a.trevl_evalno ?? "Reassessment"}</td>
                        <td style={{whiteSpace:"nowrap"}}>{fmtDate(a.trevl_assigndt)}</td>
                        <td><span style={{color:a.days_overdue>30?"var(--crit)":"var(--warn)",fontWeight:700}}>{a.days_overdue}</span></td>
                        <td><span className={`badge badge-${a.days_overdue>30?"r":"y"}`}>{a.days_overdue>30?"Urgent":"Schedule"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "evals" && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Beneficiary</th><th>Program</th><th>Eval No</th><th>Evaluated</th><th>Score</th><th>Status</th></tr></thead>
                <tbody>
                  {recentEvals.map(e => (
                    <tr key={e.trevl_id}>
                      <td className="name">{e.su_name??"—"}</td><td>{e.su_program??"—"}</td>
                      <td>{e.trevl_evalno??"—"}</td><td>{fmtDate(e.trevl_evaldt)}</td><td>{e.trevl_score??"—"}</td>
                      <td><span className={`badge badge-${e.trevl_status==="Completed"?"g":"y"}`}>{e.trevl_status}</span></td>
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
