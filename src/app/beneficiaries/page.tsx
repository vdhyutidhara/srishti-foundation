"use client";
import { useEffect, useState, useCallback } from "react";

interface Beneficiary {
  su_id: string; su_patientno: string; su_name: string; su_sex: string;
  su_age: number; su_disability: string; su_program: string; su_division: string;
  su_center: string; su_village: string; su_block: string; su_district: string;
  su_dateofadmission: string; su_isActive: number; su_discharged: number;
  su_status: string; su_owner: string; last_service: string; next_action: string;
}
interface ProfileData {
  profile: Beneficiary & { su_dob: string; su_mother_name: string; su_father_name: string; su_address1: string; su_panchayat: string; su_postalcode: string; su_dateofdischarge: string };
  treatments: { tr_id: string; tr_goal: string; tr_problem: string; tr_status: string; tr_cycle: string; tr_startdate: string; tr_enddate: string; tr_achived: string; tr_target: string; tr_therapist: string; tr_program: string }[];
  tasks: { task_id: string; task_date: string; task_activity: string; task_subactivity: string; task_status: string; task_owner: string }[];
  assessments: { trevl_id: string; trevl_evalno: string; trevl_assigndt: string; trevl_evaldt: string; trevl_status: string; trevl_score: string }[];
}

function statusBadge(b: Beneficiary) {
  if (b.su_discharged || b.su_isActive === 0) return <span className="badge badge-r">Discharged</span>;
  return <span className="badge badge-g">Active</span>;
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function avatar(name: string, size = 28) {
  const init = (name ?? "?").trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{init}</div>;
}

function ProfileModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"info" | "goals" | "sessions" | "assessments">("info");

  useEffect(() => {
    fetch(`/api/beneficiaries/${id}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, [id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          {data ? (
            <>
              {avatar(data.profile.su_name, 40)}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{data.profile.su_name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{data.profile.su_patientno} · {data.profile.su_program}</div>
              </div>
              {statusBadge(data.profile)}
            </>
          ) : error ? null : <div className="loading"><div className="spinner" /></div>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="btn btn-g btn-sm" onClick={() => alert("PDF download not yet implemented")}>⬇ PDF</button>
            <button className="btn btn-g btn-sm" onClick={() => alert("Flagged for review")}>⚑ Flag</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        {error && <div className="alertbar" style={{ margin: 16 }}>{error}</div>}
        {data && (
          <div className="modal-body">
            <div className="tabs">
              {(["info","goals","sessions","assessments"] as const).map(t => (
                <div key={t} className={`tab${tab===t?" on":""}`} onClick={() => setTab(t)}>
                  {t==="info"?"Profile":t==="goals"?`Goals (${data.treatments.length})`:t==="sessions"?`Sessions (${data.tasks.length})`:`Assessments (${data.assessments.length})`}
                </div>
              ))}
            </div>
            {tab === "info" && (
              <div className="detail-grid">
                {[["Patient No",data.profile.su_patientno],["Name",data.profile.su_name],["Sex",data.profile.su_sex],["Date of Birth",fmtDate(data.profile.su_dob)],["Age",data.profile.su_age],["Disability",data.profile.su_disability],["Program",data.profile.su_program],["Division",data.profile.su_division],["Center",data.profile.su_center],["Assigned Worker",data.profile.su_owner],["Village",data.profile.su_village],["Block",data.profile.su_block],["Panchayat",data.profile.su_panchayat],["District",data.profile.su_district],["Postal Code",data.profile.su_postalcode],["Admission Date",fmtDate(data.profile.su_dateofadmission)],["Discharge Date",fmtDate(data.profile.su_dateofdischarge)],["Mother's Name",data.profile.su_mother_name],["Father's Name",data.profile.su_father_name],["Address",data.profile.su_address1]].map(([l,v])=>(
                  <div key={String(l)} className="detail-field">
                    <div className="detail-label">{l}</div>
                    <div className="detail-val">{(v ?? "") || "—"}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === "goals" && (
              <div className="tbl-wrap">
                {!data.treatments.length ? <div className="loading">No treatment goals recorded</div> : (
                  <table className="tbl">
                    <thead><tr><th>Cycle</th><th>Goal</th><th>Problem</th><th>Target</th><th>Achieved</th><th>Status</th><th>Therapist</th></tr></thead>
                    <tbody>{data.treatments.map(t=>(
                      <tr key={t.tr_id}><td>{t.tr_cycle??"—"}</td><td className="name">{t.tr_goal??"—"}</td><td>{t.tr_problem??"—"}</td><td>{t.tr_target??"—"}</td><td>{t.tr_achived??"—"}</td>
                        <td><span className={`badge badge-${t.tr_status==="Active"?"g":t.tr_status==="Closed"?"b":"y"}`}>{t.tr_status}</span></td>
                        <td>{t.tr_therapist??"—"}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}
            {tab === "sessions" && (
              <div className="tbl-wrap">
                {!data.tasks.length ? <div className="loading">No sessions recorded</div> : (
                  <table className="tbl">
                    <thead><tr><th>Date</th><th>Activity</th><th>Sub-Activity</th><th>Status</th><th>Worker</th></tr></thead>
                    <tbody>{data.tasks.map(t=>(
                      <tr key={t.task_id}><td style={{whiteSpace:"nowrap"}}>{fmtDate(t.task_date)}</td><td className="name">{t.task_activity??"—"}</td><td>{t.task_subactivity??"—"}</td>
                        <td><span className={`badge badge-${t.task_status==="Completed"?"g":t.task_status==="Cancelled"?"r":"y"}`}>{t.task_status}</span></td>
                        <td>{t.task_owner??"—"}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}
            {tab === "assessments" && (
              <div className="tbl-wrap">
                {!data.assessments.length ? <div className="loading">No assessments recorded</div> : (
                  <table className="tbl">
                    <thead><tr><th>Eval No</th><th>Assigned</th><th>Evaluated</th><th>Score</th><th>Status</th></tr></thead>
                    <tbody>{data.assessments.map(a=>(
                      <tr key={a.trevl_id}><td>{a.trevl_evalno??"—"}</td><td>{fmtDate(a.trevl_assigndt)}</td><td>{fmtDate(a.trevl_evaldt)}</td><td>{a.trevl_score??"—"}</td>
                        <td><span className={`badge badge-${a.trevl_status==="Completed"?"g":"y"}`}>{a.trevl_status}</span></td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BeneficiariesPage() {
  const [rows, setRows] = useState<Beneficiary[]>([]);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ q: search, program, status, gender, age, page: String(page) });
    fetch(`/api/beneficiaries?${params}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); return; } setRows(d.data); setTotal(d.total); setPrograms(d.programs); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [search, program, status, gender, age, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 50);

  return (
    <>
      {selectedId && <ProfileModal id={selectedId} onClose={() => setSelectedId(null)} />}
      <div className="fbar" style={{ borderTop: "none" }}>
        <span className="flabel">Program:</span>
        {["", ...programs.slice(0,8)].map(p => (
          <div key={p||"_all"} className={`chip${program===p?" on":""}`} onClick={()=>{setProgram(p);setPage(1)}}>{p||"All"}</div>
        ))}
        <div className="fsep" />
        <span className="flabel">Status:</span>
        {[["","All"],["active","Active"],["inactive","Inactive"],["exited","Exited"]].map(([v,l])=>(
          <div key={v} className={`chip${status===v?" on":""}`} onClick={()=>{setStatus(v);setPage(1)}}>{l}</div>
        ))}
        <div className="fsep" />
        <span className="flabel">Gender:</span>
        {[["","All"],["Male","Male"],["Female","Female"]].map(([v,l])=>(
          <div key={v} className={`chip${gender===v?" on":""}`} onClick={()=>{setGender(v);setPage(1)}}>{l}</div>
        ))}
        <div className="fsep" />
        <span className="flabel">Age:</span>
        {[["","All"],["0-5","0–5"],["6-12","6–12"],["13-18","13–18"],["18+","18+"]].map(([v,l])=>(
          <div key={v} className={`chip${age===v?" on":""}`} onClick={()=>{setAge(v);setPage(1)}}>{l}</div>
        ))}
      </div>

      <div className="content" style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-inp" placeholder="Search name or patient no…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>{total.toLocaleString()} records</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <a href="/api/reports?type=beneficiaries" className="btn btn-g btn-sm">⬇ Excel/CSV</a>
          </div>
        </div>

        {error && <div className="alertbar">{error}</div>}
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>Beneficiary</th><th>Project</th><th>Age</th><th>Gender</th><th>Support Needs</th><th>Worker</th><th>Last Service</th><th>Next Action</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {!rows.length && <tr><td colSpan={10} style={{textAlign:"center",padding:24,color:"var(--muted)"}}>No beneficiaries found</td></tr>}
                  {rows.map(b => (
                    <tr key={b.su_id} style={{cursor:"pointer"}} onClick={()=>setSelectedId(b.su_id)}>
                      <td style={{whiteSpace:"nowrap"}}>{b.su_patientno??"—"}</td>
                      <td><div style={{display:"flex",alignItems:"center",gap:7}}>{avatar(b.su_name)}<span className="name">{b.su_name}</span></div></td>
                      <td>{b.su_program??"—"}</td>
                      <td>{b.su_age??"—"}</td>
                      <td>{b.su_sex??"—"}</td>
                      <td>{b.su_disability??"—"}</td>
                      <td>{b.su_owner??"—"}</td>
                      <td style={{whiteSpace:"nowrap"}}>{fmtDate(b.last_service)}</td>
                      <td style={{maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.next_action??"—"}</td>
                      <td>{statusBadge(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8,padding:"8px 12px",borderTop:"1px solid var(--border)",fontSize:12}}>
                <span style={{color:"var(--muted)"}}>Page {page} of {totalPages}</span>
                <button className="btn btn-g btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                <button className="btn btn-g btn-sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
