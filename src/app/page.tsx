"use client";
import { useEffect, useState, useCallback } from "react";
import { useFilters } from "@/lib/filters";

interface OverviewData {
  kpis: { total_registered: number; active_beneficiaries: number; new_this_period: number; served_this_period: number; followups_overdue: number; incomplete_records: number };
  projectPerf: { project: string; target: number; achieved: number; beneficiaries: number }[];
  sessionTrend: { month: string; planned: number; completed: number }[];
  alertCounts: { overdue_tasks: number; assessments_overdue: number; incomplete_records: number; expired_treatments: number };
  outcomes: { status: string; cnt: number }[];
  recentActivity: { aud_table: string; aud_field: string; aud_newvalue: string; aud_createdby: string; aud_date: string }[];
}

const MONTH_SHORT: Record<string, string> = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec" };
const PROJECT_COLORS: Record<string, string> = { MTP:"var(--c-mtp)", EIC:"var(--c-eic)", "Sristi Village":"var(--c-sv)", "Special School":"var(--c-ss)", Jeevan:"var(--c-jv)", Fellowship:"var(--c-fl)" };
const DEFINED_PROJECTS = ["MTP","EIC","Sristi Village","Special School","Jeevan","Fellowship"];

function fmt(n: number | null | undefined) { return n == null ? "—" : n.toLocaleString(); }

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const W = 80, H = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 24, marginTop: 6, overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineChart({ data }: { data: { month: string; planned: number; completed: number }[] }) {
  if (!data.length) return <div className="loading">No data</div>;
  const maxV = Math.max(...data.flatMap(d => [d.planned, d.completed]), 1);
  const W = 300, H = 120, padL = 32, padB = 24, padT = 12, padR = 8;
  const cw = (W - padL - padR) / (data.length - 1 || 1);
  const y = (v: number) => padT + H - (v / maxV) * H;
  const x = (i: number) => padL + i * cw;
  const planPts = data.map((d, i) => `${x(i)},${y(d.planned)}`).join(" ");
  const donePts = data.map((d, i) => `${x(i)},${y(d.completed)}`).join(" ");
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => Math.round(maxV * f));
  return (
    <svg viewBox={`0 0 ${W} ${padT + H + padB}`} style={{ width: "100%", height: 160 }}>
      {gridLines.map(v => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--grid)" strokeWidth="1" />
          <text x={padL - 3} y={y(v) + 3} textAnchor="end" fontSize="7" fill="var(--muted)">{v}</text>
        </g>
      ))}
      <polyline points={planPts} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 2" />
      <polyline points={donePts} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={x(i)} cy={y(d.completed)} r="3" fill="var(--accent)" stroke="var(--s1)" strokeWidth="1.5" />
          <text x={x(i)} y={padT + H + 16} textAnchor="middle" fontSize="7" fill="var(--muted)">
            {MONTH_SHORT[d.month?.split("-")[1]] ?? d.month}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DonutChart({ data }: { data: { status: string; cnt: number }[] }) {
  const total = data.reduce((s, d) => s + d.cnt, 0) || 1;
  const colors: Record<string, string> = { Active: "var(--accent)", Closed: "var(--good)", "In Progress": "var(--warn)", Discontinued: "var(--muted)" };
  const R = 38, cx = 50, cy = 50, circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map(d => {
    const pct = d.cnt / total;
    const arc = pct * circ;
    const slice = { ...d, arc, offset, pct };
    offset += arc;
    return slice;
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--grid)" strokeWidth="14" />
        {slices.map(s => (
          <circle key={s.status} cx={cx} cy={cy} r={R} fill="none"
            stroke={colors[s.status] ?? "var(--base)"}
            strokeWidth="14"
            strokeDasharray={`${s.arc} ${circ}`}
            strokeDashoffset={-(s.offset - circ / 4)}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--ink)">{total}</text>
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize="7" fill="var(--muted)">goals</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {slices.map(s => (
          <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[s.status] ?? "var(--base)", flexShrink: 0 }} />
            <span>{s.status} <strong>{Math.round(s.pct * 100)}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { filters } = useFilters();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setData(null);
    const p = new URLSearchParams({ period: filters.period, district: filters.district });
    fetch(`/api/overview?${p}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, [filters.period, filters.district]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="content"><div className="alertbar">Error: {error}</div></div>;
  if (!data) return <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>;

  const { kpis, projectPerf, sessionTrend, alertCounts, outcomes, recentActivity } = data;

  // Build project perf map from DB data, then fill all 6 defined projects
  const perfMap = Object.fromEntries(projectPerf.map(p => [p.project, p]));
  const projects6 = DEFINED_PROJECTS.map(name => ({
    name,
    color: PROJECT_COLORS[name] ?? "var(--accent)",
    target: perfMap[name]?.target ?? 0,
    achieved: perfMap[name]?.achieved ?? 0,
    beneficiaries: perfMap[name]?.beneficiaries ?? 0,
  }));

  const kpiCards = [
    { label: "Total Registered", value: kpis.total_registered, color: "var(--accent)", spark: sessionTrend.map(t => t.planned) },
    { label: "Active", value: kpis.active_beneficiaries, color: "var(--good)", spark: sessionTrend.map(t => t.completed) },
    { label: "New This Period", value: kpis.new_this_period, color: "var(--accent)", spark: [] },
    { label: "Served This Period", value: kpis.served_this_period, color: "var(--good)", spark: sessionTrend.map(t => t.completed) },
    { label: "Follow-ups Overdue", value: kpis.followups_overdue, color: "var(--crit)", spark: [] },
    { label: "Records Incomplete", value: kpis.incomplete_records, color: "var(--warn)", spark: [] },
  ];

  const alertBars = [
    { icon: "⏰", count: alertCounts.overdue_tasks, label: "Follow-ups Overdue", sub: "Tasks past due date", href: "/alerts", cls: "red" },
    { icon: "📋", count: alertCounts.incomplete_records, label: "Incomplete Records", sub: "Missing mandatory fields", href: "/data-quality", cls: "amb" },
    { icon: "🔬", count: alertCounts.assessments_overdue, label: "Assessments Due", sub: "Reassessment window passed", href: "/outcomes", cls: "amb" },
    { icon: "↗", count: alertCounts.expired_treatments, label: "Expired Treatments", sub: "Active plans past end date", href: "/alerts", cls: "blu" },
  ];

  return (
    <div className="content">
      {(alertCounts.overdue_tasks > 0 || alertCounts.incomplete_records > 0) && (
        <div className="alertbar">
          ⚠ <strong>{fmt(alertCounts.overdue_tasks)} follow-ups overdue</strong>
          {alertCounts.incomplete_records > 0 && ` · ${fmt(alertCounts.incomplete_records)} records incomplete`}
          {" · "}<a href="/alerts" style={{ color: "var(--crit)", fontWeight: 700, textDecoration: "none" }}>View all alerts →</a>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-row">
        {kpiCards.map(k => (
          <div key={k.label} className="kpi">
            <div className="kpi-lbl">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color }}>{fmt(k.value)}</div>
            {k.spark.length > 1 && <Sparkline values={k.spark} color={k.color} />}
          </div>
        ))}
      </div>

      <div className="row2">
        {/* Project Performance */}
        <div className="card">
          <div className="card-title">Project Performance — Target vs Achieved</div>
          <div className="card-sub">Beneficiary reach this period</div>
          <div className="prog-row" style={{ marginTop: 8 }}>
            {projects6.map(p => {
              const pct = p.target > 0 ? Math.min(100, Math.round((p.achieved / p.target) * 100)) : 0;
              return (
                <div key={p.name} className="prog-item">
                  <div className="prog-name" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
                    {p.name}
                  </div>
                  <div className="prog-bar-wrap">
                    <div className="prog-bar" style={{ width: `${pct}%`, background: p.color }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", width: 70, textAlign: "right" }}>
                    {p.achieved > 0 ? `${p.achieved} / ${p.target}` : "—"} <span style={{ fontWeight: 700, color: "var(--ink2)" }}>{pct > 0 ? `${pct}%` : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions line chart */}
        <div className="card">
          <div className="card-title">Sessions — Planned vs Completed</div>
          <div className="card-sub">Last 6 months</div>
          <LineChart data={sessionTrend} />
          <div className="legend" style={{ marginTop: 6 }}>
            <div className="leg-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 14, height: 2, background: "var(--accent)", borderRadius: 1 }} /> Completed
            </div>
            <div className="leg-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <div style={{ width: 14, height: 2, background: "var(--muted)", borderRadius: 1, backgroundImage: "repeating-linear-gradient(90deg,var(--muted) 0,var(--muted) 4px,transparent 4px,transparent 6px)" }} /> Planned
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
        {/* Action Required */}
        <div className="card">
          <div className="card-title">Action Required</div>
          <div className="card-sub">Prioritised for this period</div>
          <div className="alert-list">
            {alertBars.map(a => (
              <div key={a.label} className="alert-item">
                <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ fontSize: 20, fontWeight: 800, minWidth: 36, color: a.cls === "red" ? "var(--crit)" : a.cls === "amb" ? "var(--warn)" : "var(--accent)" }}>{fmt(a.count)}</div>
                <div className="alert-body">
                  <div className="alert-title">{a.label}</div>
                  <div className="alert-meta">{a.sub}</div>
                </div>
                <a href={a.href} className="btn btn-g btn-sm" style={{ textDecoration: "none" }}>View →</a>
              </div>
            ))}
          </div>
        </div>

        {/* Outcomes donut */}
        <div className="card">
          <div className="card-title">Outcomes Distribution</div>
          <div className="card-sub">Treatment goal status</div>
          {outcomes.length > 0 ? <DonutChart data={outcomes} /> : <div className="loading" style={{ padding: "20px 0" }}>No data</div>}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-title">Recent Activity</div>
          <div className="card-sub">Last updates</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    {a.aud_table} — {a.aud_field} updated
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.aud_createdby}</div>
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{a.aud_date?.split(" ")[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
