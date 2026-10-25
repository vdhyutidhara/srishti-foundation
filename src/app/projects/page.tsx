"use client";
import { useEffect, useState } from "react";

interface ProjectData {
  programs: { su_division: string; su_program: string; count: number }[];
  atpSummary: { atp_division: string; atp_domain: string; total_target: number; total_achieved: number; plans: number }[];
  beneficiariesByProgram: { su_division: string; su_program: string; total: number; active: number; discharged: number }[];
  sessionsByProgram: { division: string; total_sessions: number; completed: number; pending: number; cancelled: number }[];
}

// The 6 projects defined in the requirements doc
const PROJECTS = [
  { key: "MTP",           label: "MTP",                color: "var(--c-mtp)", desc: "Mobile Training Programme" },
  { key: "EIC",           label: "EIC",                color: "var(--c-eic)", desc: "Early Intervention Centre" },
  { key: "Sristi Village",label: "Sristi Village",     color: "var(--c-sv)",  desc: "Community-based programme" },
  { key: "Special School",label: "Special School",     color: "var(--c-ss)",  desc: "Special education centre" },
  { key: "Jeevan",        label: "Jeevan Vikas",       color: "var(--c-jv)",  desc: "Livelihood & vocational" },
  { key: "Fellowship",    label: "Fellowship",         color: "var(--c-fl)",  desc: "Professional fellowship" },
];

function pct(a: number, t: number) {
  if (!t) return 0;
  return Math.min(100, Math.round((a / t) * 100));
}

function fmt(n: number | null | undefined) {
  return n == null ? "—" : n.toLocaleString();
}

const CURRENT_YEAR = "2025";

export default function ProjectsPage() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selected, setSelected] = useState("all");

  useEffect(() => {
    fetch(`/api/projects?year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch((e) => setError(String(e)));
  }, [year]);

  // Helpers to look up DB data by project key (tries matching su_division or su_program)
  function getBeneficiaries(key: string) {
    if (!data) return null;
    return data.beneficiariesByProgram.find(
      (b) => b.su_division?.toLowerCase().includes(key.toLowerCase()) ||
             b.su_program?.toLowerCase().includes(key.toLowerCase())
    ) ?? null;
  }

  function getSessions(key: string) {
    if (!data) return null;
    return data.sessionsByProgram.find(
      (s) => s.division?.toLowerCase().includes(key.toLowerCase())
    ) ?? null;
  }

  function getAtp(key: string) {
    if (!data) return [];
    return data.atpSummary.filter(
      (a) => a.atp_division?.toLowerCase().includes(key.toLowerCase())
    );
  }

  const visibleProjects = selected === "all"
    ? PROJECTS
    : PROJECTS.filter((p) => p.key === selected);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Project Dashboards</div>
        <div className="topbar-right">
          <select className="tsel" value={year} onChange={(e) => setYear(e.target.value)}>
            {["2025", "2024", "2023", "2022"].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <a href="/reports" className="btn btn-g btn-sm">⬇ Export</a>
        </div>
      </div>

      <div className="fbar">
        <span className="flabel">Project:</span>
        <div className={`chip${selected === "all" ? " on" : ""}`} onClick={() => setSelected("all")}>All</div>
        {PROJECTS.map((p) => (
          <div key={p.key} className={`chip${selected === p.key ? " on" : ""}`} onClick={() => setSelected(p.key)}>
            {p.label}
          </div>
        ))}
      </div>

      {error && <div className="content"><div className="alertbar">{error}</div></div>}

      <div className="content">
        {/* KPI cards — one per project, always shown */}
        <div className="kpi-row">
          {PROJECTS.map((p) => {
            const ben = getBeneficiaries(p.key);
            return (
              <div
                key={p.key}
                className="kpi"
                style={{ cursor: "pointer", borderColor: selected === p.key ? p.color : undefined, borderWidth: selected === p.key ? 2 : undefined }}
                onClick={() => setSelected(selected === p.key ? "all" : p.key)}
              >
                <div className="kpi-lbl" style={{ color: p.color }}>{p.label}</div>
                <div className="kpi-val">{ben ? fmt(ben.total) : "—"}</div>
                <div className="kpi-delta">
                  <span className="up">{ben ? fmt(ben.active) : "—"} active</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{p.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Per-project detail panels */}
        {visibleProjects.map((p) => {
          const ben = getBeneficiaries(p.key);
          const sess = getSessions(p.key);
          const atpRows = getAtp(p.key);
          const sessRate = sess ? pct(sess.completed, sess.total_sessions) : null;

          return (
            <div key={p.key} className="card" style={{ borderLeft: `4px solid ${p.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <div>
                  <div className="card-title" style={{ color: p.color }}>{p.label}</div>
                  <div className="card-sub" style={{ margin: 0 }}>{p.desc}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[
                  ["Total Beneficiaries", fmt(ben?.total)],
                  ["Active",              fmt(ben?.active)],
                  ["Discharged",          fmt(ben?.discharged)],
                  ["Sessions " + year,    fmt(sess?.total_sessions)],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ background: "var(--s0)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{lbl}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{val}</div>
                  </div>
                ))}
              </div>

              <div className="row2">
                {/* Session completion bar */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Session Completion — {year}</div>
                  {sess ? (
                    <>
                      <div className="prog-item" style={{ marginBottom: 6 }}>
                        <div className="prog-name">Completed</div>
                        <div className="prog-bar-wrap">
                          <div className="prog-bar" style={{ width: `${sessRate}%`, background: (sessRate ?? 0) >= 80 ? "var(--good)" : "var(--warn)" }} />
                        </div>
                        <div className="prog-pct" style={{ color: (sessRate ?? 0) >= 80 ? "var(--good)" : "var(--warn)" }}>{sessRate}%</div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 16 }}>
                        <span><span style={{ color: "var(--good)", fontWeight: 700 }}>{fmt(sess.completed)}</span> done</span>
                        <span><span style={{ color: "var(--warn)", fontWeight: 700 }}>{fmt(sess.pending)}</span> pending</span>
                        <span><span style={{ color: "var(--muted)", fontWeight: 700 }}>{fmt(sess.cancelled)}</span> cancelled</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No session data matched for {p.label}</div>
                  )}
                </div>

                {/* ATP performance */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>ATP Target vs Achieved</div>
                  {atpRows.length > 0 ? (
                    <div className="prog-row">
                      {atpRows.slice(0, 5).map((a, i) => {
                        const p2 = pct(a.total_achieved, a.total_target);
                        return (
                          <div key={i} className="prog-item">
                            <div className="prog-name" title={a.atp_domain ?? ""}>{a.atp_domain ?? "Overall"}</div>
                            <div className="prog-bar-wrap">
                              <div className="prog-bar" style={{ width: `${p2}%`, background: p2 >= 80 ? "var(--good)" : p2 >= 50 ? "var(--warn)" : "var(--crit)" }} />
                            </div>
                            <div className="prog-pct">{p2}%</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>No ATP data matched for {p.label}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* All programs from DB — for reference */}
        {data && data.programs.length > 0 && (
          <div className="card">
            <div className="card-title">All Programs in Database</div>
            <div className="card-sub">Raw program/division data — use this to confirm mapping to the 6 projects above</div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Division (su_division)</th><th>Program (su_program)</th><th>Beneficiaries</th></tr></thead>
                <tbody>
                  {data.programs.map((p, i) => (
                    <tr key={i}>
                      <td>{p.su_division ?? "—"}</td>
                      <td className="name">{p.su_program ?? "—"}</td>
                      <td>{fmt(p.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
