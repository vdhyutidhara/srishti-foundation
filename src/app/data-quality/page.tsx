"use client";
import { useEffect, useState } from "react";

interface DataQualityData {
  kpis: { missing_fields: number; duplicates: number; outdated_contacts: number; inconsistent_dates: number };
  missingFields: { su_id: string; su_name: string; su_patientno: string; su_program: string; su_division: string; no_dob: number; no_sex: number; no_disability: number; no_village: number; no_admission: number; no_worker: number }[];
  duplicates: { su_name: string; record_count: number; sample_id: string; sample_program: string; min_admission: string }[];
  outdatedContacts: { su_id: string; su_name: string; su_patientno: string; su_program: string; last_session: string | null; days_since_contact: number }[];
  inconsistentDates: { su_id: string; su_name: string; su_patientno: string; su_program: string; dob: string; admission: string }[];
  fieldCoverage: { su_program: string; total: number; dob_pct: number; sex_pct: number; disability_pct: number; village_pct: number }[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function PctBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 90 ? "var(--good)" : pct >= 70 ? "var(--warn)" : "var(--crit)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
      <span style={{ width: 70, color: "var(--muted)" }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "var(--s2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ width: 32, fontWeight: 700, color }}>{pct}%</span>
    </div>
  );
}

type ViewType = "missing" | "duplicates" | "outdated" | "inconsistent" | "coverage";

export default function DataQualityPage() {
  const [data, setData] = useState<DataQualityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("missing");

  useEffect(() => {
    fetch("/api/data-quality")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(e => setError(String(e)));
  }, []);

  if (error) return <div className="content"><div className="alertbar">{error}</div></div>;
  if (!data) return <div className="content"><div className="loading"><div className="spinner" /> Loading…</div></div>;

  const { kpis } = data;

  const tabs: { key: ViewType; label: string; count: number | null }[] = [
    { key: "missing", label: "Missing Fields", count: data.missingFields.length },
    { key: "duplicates", label: "Potential Duplicates", count: data.duplicates.length },
    { key: "outdated", label: "Outdated Contacts", count: data.outdatedContacts.length },
    { key: "inconsistent", label: "Inconsistent Dates", count: data.inconsistentDates.length },
    { key: "coverage", label: "Field Coverage by Program", count: null },
  ];

  return (
    <>
      <div className="fbar" style={{ borderTop: "none" }}>
        <div style={{ marginLeft: "auto" }}>
          <a href="/api/reports?type=data-quality" className="btn btn-g btn-sm">⬇ Data Quality CSV</a>
        </div>
      </div>

      <div className="content">
        <div className="kpi-row-sm">
          <div className="kpi" style={{ cursor: "pointer" }} onClick={() => setView("missing")}>
            <div className="kpi-lbl">Missing Fields</div>
            <div className="kpi-val" style={{ color: kpis.missing_fields > 0 ? "var(--warn)" : "var(--good)" }}>{kpis.missing_fields.toLocaleString()}</div>
            <div className="kpi-delta dn">Records with gaps</div>
          </div>
          <div className="kpi" style={{ cursor: "pointer" }} onClick={() => setView("duplicates")}>
            <div className="kpi-lbl">Potential Duplicates</div>
            <div className="kpi-val" style={{ color: kpis.duplicates > 0 ? "var(--warn)" : "var(--good)" }}>{kpis.duplicates.toLocaleString()}</div>
            <div className="kpi-delta dn">Same name entries</div>
          </div>
          <div className="kpi" style={{ cursor: "pointer" }} onClick={() => setView("outdated")}>
            <div className="kpi-lbl">Outdated Contacts</div>
            <div className="kpi-val" style={{ color: kpis.outdated_contacts > 0 ? "var(--warn)" : "var(--good)" }}>{kpis.outdated_contacts.toLocaleString()}</div>
            <div className="kpi-delta dn">&gt;6 months no contact</div>
          </div>
          <div className="kpi" style={{ cursor: "pointer" }} onClick={() => setView("inconsistent")}>
            <div className="kpi-lbl">Inconsistent Dates</div>
            <div className="kpi-val" style={{ color: kpis.inconsistent_dates > 0 ? "var(--crit)" : "var(--good)" }}>{kpis.inconsistent_dates.toLocaleString()}</div>
            <div className="kpi-delta dn">DOB after admission</div>
          </div>
        </div>

        <div className="card">
          <div className="tabs">
            {tabs.map(t => (
              <div key={t.key} className={`tab${view===t.key?" on":""}`} onClick={() => setView(t.key)}>
                {t.label}{t.count !== null && t.count > 0 && <span style={{ background: "var(--warn)", color: "#fff", borderRadius: 8, padding: "1px 5px", fontSize: 9, marginLeft: 4 }}>{t.count}</span>}
              </div>
            ))}
          </div>

          {view === "missing" && (
            <div className="tbl-wrap">
              {data.missingFields.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No missing fields detected</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Patient No</th><th>Name</th><th>Program</th><th>Division</th><th>Missing Fields</th></tr></thead>
                  <tbody>
                    {data.missingFields.map(r => {
                      const missing = [r.no_dob && "DOB", r.no_sex && "Sex", r.no_disability && "Disability", r.no_village && "Village", r.no_admission && "Admission", r.no_worker && "Worker"].filter(Boolean).join(", ");
                      const count = [r.no_dob, r.no_sex, r.no_disability, r.no_village, r.no_admission, r.no_worker].filter(Boolean).length;
                      return (
                        <tr key={r.su_id}>
                          <td>{r.su_patientno ?? "—"}</td>
                          <td className="name">{r.su_name}</td>
                          <td>{r.su_program ?? "—"}</td>
                          <td>{r.su_division ?? "—"}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className={`badge badge-${count >= 3 ? "r" : "y"}`}>{missing}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "duplicates" && (
            <div className="tbl-wrap">
              {data.duplicates.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No duplicate names detected</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Name</th><th>Count</th><th>Sample ID</th><th>Program</th><th>Earliest Admission</th></tr></thead>
                  <tbody>
                    {data.duplicates.map((d, i) => (
                      <tr key={i}>
                        <td className="name">{d.su_name}</td>
                        <td><span style={{ color: "var(--crit)", fontWeight: 700 }}>{d.record_count}</span></td>
                        <td>{d.sample_id ?? "—"}</td>
                        <td>{d.sample_program ?? "—"}</td>
                        <td>{fmtDate(d.min_admission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "outdated" && (
            <div className="tbl-wrap">
              {data.outdatedContacts.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ All active beneficiaries have recent contact</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Patient No</th><th>Name</th><th>Program</th><th>Last Session</th><th>Days Since Contact</th></tr></thead>
                  <tbody>
                    {data.outdatedContacts.map((r, i) => (
                      <tr key={i}>
                        <td>{r.su_patientno ?? "—"}</td>
                        <td className="name">{r.su_name}</td>
                        <td>{r.su_program ?? "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.last_session)}</td>
                        <td><span style={{ color: r.days_since_contact > 365 ? "var(--crit)" : "var(--warn)", fontWeight: 700 }}>{r.days_since_contact == null ? "Never" : `${r.days_since_contact}d`}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "inconsistent" && (
            <div className="tbl-wrap">
              {data.inconsistentDates.length === 0 ? (
                <div className="loading" style={{ color: "var(--good)" }}>✓ No date inconsistencies found</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Patient No</th><th>Name</th><th>Program</th><th>DOB</th><th>Admission Date</th><th>Issue</th></tr></thead>
                  <tbody>
                    {data.inconsistentDates.map((r, i) => (
                      <tr key={i}>
                        <td>{r.su_patientno ?? "—"}</td>
                        <td className="name">{r.su_name}</td>
                        <td>{r.su_program ?? "—"}</td>
                        <td style={{ color: "var(--crit)" }}>{r.dob ?? "—"}</td>
                        <td>{r.admission ?? "—"}</td>
                        <td><span className="badge badge-r">DOB &gt; Admission</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {view === "coverage" && (
            <div style={{ padding: "8px 0" }}>
              {data.fieldCoverage.length === 0 ? (
                <div className="loading">No data</div>
              ) : (
                data.fieldCoverage.map(p => (
                  <div key={p.su_program} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div className="card-title" style={{ margin: 0 }}>{p.su_program || "(No Program)"}</div>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.total} beneficiaries</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <PctBar pct={p.dob_pct} label="DOB" />
                      <PctBar pct={p.sex_pct} label="Gender" />
                      <PctBar pct={p.disability_pct} label="Disability" />
                      <PctBar pct={p.village_pct} label="Village" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
