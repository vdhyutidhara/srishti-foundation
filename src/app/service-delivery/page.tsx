"use client";
import { useEffect, useState } from "react";

interface SDData {
  monthly: { month: string; planned: number; completed: number; overdue: number; beneficiaries_served: number }[];
  byWorker: { worker: string; total: number; completed: number; beneficiaries: number }[];
  byActivity: { activity: string; total: number; completed: number }[];
  byDivision: { division: string; total: number; completed: number; beneficiaries: number }[];
  attendance: { present: number; absent: number; missed: number; total: number };
  missedSessions: { su_patientno: string; su_name: string; su_program: string; task_date: string; task_activity: string; task_status: string; task_owner: string; task_division: string }[];
}

const MONTH_LABELS: Record<string, string> = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun","07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec" };

function pct(a: number, t: number) { return t ? Math.min(100, Math.round((a / t) * 100)) : 0; }

function AttendanceDonut({ att }: { att: SDData["attendance"] }) {
  const total = att.total || 1;
  const R = 42, cx = 55, cy = 55, circ = 2 * Math.PI * R;
  const presentPct = att.present / total;
  const absentPct = att.absent / total;
  const missedPct = att.missed / total;
  const presentArc = presentPct * circ;
  const absentArc = absentPct * circ;
  const missedArc = missedPct * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--grid)" strokeWidth="15" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--good)" strokeWidth="15"
          strokeDasharray={`${presentArc} ${circ}`} strokeDashoffset={circ / 4} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--warn)" strokeWidth="15"
          strokeDasharray={`${absentArc} ${circ}`} strokeDashoffset={circ / 4 - presentArc} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--crit)" strokeWidth="15"
          strokeDasharray={`${missedArc} ${circ}`} strokeDashoffset={circ / 4 - presentArc - absentArc} />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--ink)">{pct(att.present, total)}%</text>
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize="8" fill="var(--muted)">Attended</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[["var(--good)", `Present ${pct(att.present,total)}%`, att.present], ["var(--warn)", `Leave/On-hold ${pct(att.absent,total)}%`, att.absent], ["var(--crit)", `Missed ${pct(att.missed,total)}%`, att.missed]].map(([c,l,v]) => (
          <div key={String(l)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: String(c), flexShrink: 0 }} />
            <span>{String(l)}</span>
            <span style={{ color: "var(--muted)", marginLeft: 4 }}>({Number(v).toLocaleString()})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

const CURRENT_YEAR = "2025";

export default function ServiceDeliveryPage() {
  const [data, setData] = useState<SDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [view, setView] = useState<"monthly" | "worker" | "activity" | "division">("monthly");

  useEffect(() => {
    fetch(`/api/service-delivery?year=${year}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, [year]);

  const totals = data?.monthly.reduce(
    (acc, m) => ({ planned: acc.planned + m.planned, completed: acc.completed + m.completed, overdue: acc.overdue + m.overdue, beneficiaries: acc.beneficiaries + m.beneficiaries_served }),
    { planned: 0, completed: 0, overdue: 0, beneficiaries: 0 }
  ) ?? { planned: 0, completed: 0, overdue: 0, beneficiaries: 0 };

  const refPending = data?.byActivity.find(a => a.activity?.toLowerCase().includes("refer"))?.total ?? 0;

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <span className="flabel">Year:</span>
        {["2025","2024","2023","2022"].map(y => (
          <div key={y} className={`chip${year===y?" on":""}`} onClick={() => setYear(y)}>{y}</div>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <a href={`/api/reports?type=sessions&year=${year}`} className="btn btn-g btn-sm">⬇ CSV</a>
        </div>
      </div>

      {error && <div className="content"><div className="alertbar">{error}</div></div>}
      {!data ? (
        <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>
      ) : (
        <div className="content">
          <div className="kpi-row-sm">
            <div className="kpi"><div className="kpi-lbl">Sessions Planned</div><div className="kpi-val">{totals.planned.toLocaleString()}</div><div className="kpi-delta neu">— this period</div></div>
            <div className="kpi"><div className="kpi-lbl">Sessions Completed</div><div className="kpi-val" style={{color:"var(--good)"}}>{totals.completed.toLocaleString()}</div><div className="kpi-delta up">▲ {pct(totals.completed,totals.planned)}%</div></div>
            <div className="kpi"><div className="kpi-lbl">Missed / Cancelled</div><div className="kpi-val" style={{color:"var(--warn)"}}>{(data.attendance.absent+data.attendance.missed).toLocaleString()}</div><div className="kpi-delta dn">▼ {pct(data.attendance.absent+data.attendance.missed,totals.planned)}%</div></div>
            <div className="kpi"><div className="kpi-lbl">Referrals Pending</div><div className="kpi-val" style={{color:"var(--accent)"}}>{refPending || "—"}</div><div className="kpi-delta neu">— active</div></div>
          </div>

          <div className="row2">
            {/* Sessions by Service Type */}
            <div className="card">
              <div className="card-title">Sessions by Service Type</div>
              <div className="card-sub">Completed this period</div>
              <div className="prog-row" style={{ marginTop: 8 }}>
                {data.byActivity.slice(0, 8).map(a => (
                  <div key={a.activity} className="prog-item">
                    <div className="prog-name" title={a.activity}>{a.activity || "—"}</div>
                    <div className="prog-bar-wrap">
                      <div className="prog-bar" style={{ width: `${pct(a.completed, data.byActivity[0]?.total || 1)}%`, background: "var(--accent)" }} />
                    </div>
                    <div className="prog-pct">{a.completed}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance donut */}
            <div className="card">
              <div className="card-title">Attendance Breakdown</div>
              <div className="card-sub">All beneficiaries this period</div>
              <AttendanceDonut att={data.attendance} />
            </div>
          </div>

          {/* Missed/Cancelled table */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div className="card-title">Missed / Cancelled Sessions</div>
                <div className="card-sub">{data.missedSessions.length} records shown</div>
              </div>
            </div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Patient No</th><th>Beneficiary</th><th>Project</th><th>Date</th><th>Session Type</th><th>Reason</th><th>Worker</th><th>Action</th></tr></thead>
                <tbody>
                  {!data.missedSessions.length && <tr><td colSpan={8} style={{textAlign:"center",color:"var(--muted)",padding:16}}>No missed sessions</td></tr>}
                  {data.missedSessions.map((s, i) => (
                    <tr key={i}>
                      <td>{s.su_patientno ?? "—"}</td>
                      <td className="name">{s.su_name ?? "—"}</td>
                      <td>{s.su_program ?? "—"}</td>
                      <td style={{whiteSpace:"nowrap"}}>{fmtDate(s.task_date)}</td>
                      <td>{s.task_activity ?? "—"}</td>
                      <td><span className={`badge badge-${s.task_status==="Cancelled"?"r":"y"}`}>{s.task_status}</span></td>
                      <td>{s.task_owner ?? "—"}</td>
                      <td><button className="btn btn-g btn-sm" onClick={() => alert("Reschedule feature coming soon")}>Reschedule</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed breakdown tabs */}
          <div className="card">
            <div className="tabs">
              {(["monthly","worker","activity","division"] as const).map(v => (
                <div key={v} className={`tab${view===v?" on":""}`} onClick={() => setView(v)}>
                  {v==="monthly"?"Monthly Trend":v==="worker"?"By Worker":v==="activity"?"By Activity":"By Division"}
                </div>
              ))}
            </div>
            {view === "monthly" && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Month</th><th>Planned</th><th>Completed</th><th>Overdue</th><th>Beneficiaries</th><th>Completion Rate</th></tr></thead>
                  <tbody>{data.monthly.map(m => (
                    <tr key={m.month}>
                      <td style={{whiteSpace:"nowrap"}}>{MONTH_LABELS[m.month?.split("-")[1]] ?? m.month} {m.month?.split("-")[0]}</td>
                      <td>{m.planned}</td><td style={{color:"var(--good)"}}>{m.completed}</td>
                      <td style={{color:"var(--crit)"}}>{m.overdue}</td><td>{m.beneficiaries_served}</td>
                      <td><div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:6,background:"var(--s2)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{width:`${pct(m.completed,m.planned)}%`,height:"100%",background:pct(m.completed,m.planned)>=80?"var(--good)":"var(--warn)",borderRadius:3}} />
                        </div>
                        <span style={{fontSize:11,fontWeight:700,width:32}}>{pct(m.completed,m.planned)}%</span>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {view === "worker" && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Worker</th><th>Total</th><th>Completed</th><th>Beneficiaries</th><th>Rate</th></tr></thead>
                  <tbody>{data.byWorker.map(w => (
                    <tr key={w.worker}><td className="name">{w.worker??"—"}</td><td>{w.total}</td>
                      <td style={{color:"var(--good)"}}>{w.completed}</td><td>{w.beneficiaries}</td>
                      <td><span style={{fontWeight:700,color:pct(w.completed,w.total)>=80?"var(--good)":"var(--warn)"}}>{pct(w.completed,w.total)}%</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {view === "activity" && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Activity</th><th>Total</th><th>Completed</th><th>Rate</th></tr></thead>
                  <tbody>{data.byActivity.map(a => (
                    <tr key={a.activity}><td className="name">{a.activity??"—"}</td><td>{a.total}</td><td>{a.completed}</td>
                      <td><span style={{fontWeight:700,color:pct(a.completed,a.total)>=80?"var(--good)":"var(--warn)"}}>{pct(a.completed,a.total)}%</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {view === "division" && (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Division</th><th>Total</th><th>Completed</th><th>Beneficiaries</th><th>Rate</th></tr></thead>
                  <tbody>{data.byDivision.map(d => (
                    <tr key={d.division}><td className="name">{d.division??"—"}</td><td>{d.total}</td>
                      <td style={{color:"var(--good)"}}>{d.completed}</td><td>{d.beneficiaries}</td>
                      <td><span style={{fontWeight:700,color:pct(d.completed,d.total)>=80?"var(--good)":"var(--warn)"}}>{pct(d.completed,d.total)}%</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
