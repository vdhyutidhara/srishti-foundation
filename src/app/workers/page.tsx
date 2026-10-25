"use client";
import { useEffect, useState } from "react";

interface WorkersData {
  caseload: { worker: string; project: string; caseload: number; visits_done: number; pending: number; overdue_followups: number; last_activity: string | null; total_tasks: number }[];
  activitySummary: { worker: string; total: number; completed: number; cancelled: number; overdue: number; last_task_date: string | null }[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function pct(a: number, t: number) { return t ? Math.min(100, Math.round((a / t) * 100)) : 0; }

function StatusDot({ overdue }: { overdue: number }) {
  const color = overdue === 0 ? "var(--good)" : overdue <= 3 ? "var(--warn)" : "var(--crit)";
  const label = overdue === 0 ? "On Track" : overdue <= 3 ? "Attention" : "At Risk";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

export default function WorkersPage() {
  const [data, setData] = useState<WorkersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"caseload" | "activity">("caseload");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/workers")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, []);

  if (error) return <div className="content"><div className="alertbar">{error}</div></div>;
  if (!data) return <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>;

  const filteredCaseload = data.caseload.filter(w => !search || w.worker?.toLowerCase().includes(search.toLowerCase()));
  const filteredActivity = data.activitySummary.filter(w => !search || w.worker?.toLowerCase().includes(search.toLowerCase()));

  // Aggregate per worker for KPI row
  const workerMap = new Map<string, { caseload: number; visits: number; overdue: number }>();
  for (const r of data.caseload) {
    const prev = workerMap.get(r.worker) ?? { caseload: 0, visits: 0, overdue: 0 };
    workerMap.set(r.worker, { caseload: prev.caseload + r.caseload, visits: prev.visits + r.visits_done, overdue: prev.overdue + r.overdue_followups });
  }
  const totalWorkers = workerMap.size;
  const atRisk = [...workerMap.values()].filter(w => w.overdue > 3).length;
  const totalCaseload = [...workerMap.values()].reduce((s, w) => s + w.caseload, 0);
  const totalVisits = [...workerMap.values()].reduce((s, w) => s + w.visits, 0);

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <div className="search-wrap" style={{ maxWidth: 280 }}>
          <span className="search-icon">🔍</span>
          <input className="search-inp" placeholder="Search worker…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/api/reports?type=sessions" className="btn btn-g btn-sm">⬇ Sessions CSV</a>
        </div>
      </div>

      <div className="content">
        <div className="kpi-row-sm">
          <div className="kpi"><div className="kpi-lbl">Total Workers</div><div className="kpi-val">{totalWorkers}</div><div className="kpi-delta neu">— this year</div></div>
          <div className="kpi"><div className="kpi-lbl">Total Caseload</div><div className="kpi-val">{totalCaseload.toLocaleString()}</div><div className="kpi-delta up">Active beneficiaries</div></div>
          <div className="kpi"><div className="kpi-lbl">Visits Completed</div><div className="kpi-val" style={{ color: "var(--good)" }}>{totalVisits.toLocaleString()}</div><div className="kpi-delta up">This year</div></div>
          <div className="kpi"><div className="kpi-lbl">Workers At Risk</div><div className="kpi-val" style={{ color: "var(--crit)" }}>{atRisk}</div><div className="kpi-delta dn">&gt;3 overdue items</div></div>
        </div>

        <div className="card">
          <div className="tabs">
            <div className={`tab${view==="caseload"?" on":""}`} onClick={() => setView("caseload")}>Caseload by Worker</div>
            <div className={`tab${view==="activity"?" on":""}`} onClick={() => setView("activity")}>Activity Summary</div>
          </div>

          {view === "caseload" && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Worker</th><th>Project</th><th>Caseload</th><th>Visits Done</th><th>Pending</th><th>Overdue Follow-ups</th><th>Last Activity</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredCaseload.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>No workers found</td></tr>}
                  {filteredCaseload.map((w, i) => (
                    <tr key={i}>
                      <td className="name">{w.worker ?? "—"}</td>
                      <td>{w.project ?? "—"}</td>
                      <td><span style={{ fontWeight: 700 }}>{w.caseload}</span></td>
                      <td style={{ color: "var(--good)" }}>{w.visits_done}</td>
                      <td style={{ color: "var(--warn)" }}>{w.pending}</td>
                      <td style={{ color: w.overdue_followups > 3 ? "var(--crit)" : w.overdue_followups > 0 ? "var(--warn)" : "var(--good)", fontWeight: 700 }}>{w.overdue_followups}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(w.last_activity)}</td>
                      <td><StatusDot overdue={w.overdue_followups} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "activity" && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>Worker</th><th>Total Tasks</th><th>Completed</th><th>Cancelled</th><th>Overdue</th><th>Completion Rate</th><th>Last Task</th></tr>
                </thead>
                <tbody>
                  {filteredActivity.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>No workers found</td></tr>}
                  {filteredActivity.map((w, i) => {
                    const rate = pct(w.completed, w.total);
                    return (
                      <tr key={i}>
                        <td className="name">{w.worker ?? "—"}</td>
                        <td>{w.total}</td>
                        <td style={{ color: "var(--good)" }}>{w.completed}</td>
                        <td style={{ color: "var(--warn)" }}>{w.cancelled}</td>
                        <td style={{ color: w.overdue > 3 ? "var(--crit)" : "var(--warn)", fontWeight: 700 }}>{w.overdue}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: "var(--s2)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${rate}%`, height: "100%", background: rate >= 80 ? "var(--good)" : rate >= 60 ? "var(--warn)" : "var(--crit)", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, width: 32, color: rate >= 80 ? "var(--good)" : rate >= 60 ? "var(--warn)" : "var(--crit)" }}>{rate}%</span>
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(w.last_task_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
