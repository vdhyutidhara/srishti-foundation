import { useEffect, useState } from "react";
import { api, useResource } from "./api.js";
import { Icon, Dialog, Status, LoadState } from "./ui.jsx";
import {
  Overview,
  Projects,
  Beneficiaries,
  Reports,
  Connection,
  ProfileDialog,
  ExportDialog,
  MyProgress,
  MySessions,
  MyCaseload,
  Admin,
} from "./views.jsx";
const NAV = {
  org: [
    { id: "overview", name: "Overview", icon: "overview" },
    { id: "projects", name: "Projects", icon: "projects" },
    { id: "beneficiaries", name: "Beneficiaries", icon: "people" },
    { id: "reports", name: "Reports & explore", icon: "reports" },
    { id: "connection", name: "Data connection", icon: "connection" },
  ],
  caseload: [
    { id: "caseload", name: "My caseload", icon: "people" },
    { id: "reports", name: "Reports", icon: "reports" },
  ],
  self: [
    { id: "progress", name: "My progress", icon: "heart" },
    { id: "sessions", name: "My sessions", icon: "activity" },
  ],
  system: [
    { id: "admin", name: "System", icon: "home" },
    { id: "roles", name: "Access & roles", icon: "shield" },
  ],
};
const WORKSPACE_LABEL = {
  org: "MANAGEMENT WORKSPACE",
  caseload: "TEACHING WORKSPACE",
  self: "MY PORTAL",
  system: "ADMINISTRATION",
};
const navFor = (user) => NAV[user?.scope] || NAV.org;
const PAGE_COPY = {
  overview: {
    title: "A clearer picture of your impact.",
    sub: "Every person. Every program. One connected view.",
  },
  projects: {
    title: "Projects",
    sub: "See how each program is reaching and supporting people.",
  },
  beneficiaries: {
    title: "Beneficiaries",
    sub: "Find the people behind the numbers, within your permitted scope.",
  },
  reports: {
    title: "Reports & explore",
    sub: "Your questions, answered. No dashboard-building skills needed.",
  },
  connection: {
    title: "Data connection",
    sub: "A transparent view of where your information comes from.",
  },
  progress: {
    title: "Welcome back.",
    sub: "A gentle, honest view of progress — one step at a time.",
  },
  sessions: {
    title: "My sessions",
    sub: "Every session so far, and how attendance is going.",
  },
  caseload: {
    title: "Your students, in one place.",
    sub: "The people you support, and who needs attention first.",
  },
  admin: {
    title: "System",
    sub: "Keep the platform healthy and access rules sound.",
  },
  roles: {
    title: "Access & roles",
    sub: "Who can see and do what across the portal.",
  },
};
const initialFilters = {
  project: "all",
  district: "all",
  start: "2026-10-01",
  end: "2026-11-01",
  status: "all",
  gender: "all",
  age: "all",
  worker: "",
  support: "all",
};
const roles = [
  {
    id: "director",
    group: "Management staff",
    name: "Director",
    text: "All demo projects, profiles and reports.",
  },
  {
    id: "project-head",
    group: "Management staff",
    name: "EIC project head",
    text: "Early Intervention Centre records only.",
  },
  {
    id: "coordinator",
    group: "Management staff",
    name: "MTP coordinator",
    text: "Community-based services records only.",
  },
  {
    id: "reporter",
    group: "Management staff",
    name: "Reporting officer",
    text: "Aggregate views and reports. No profiles.",
  },
  {
    id: "teacher",
    group: "Families & learners",
    name: "Teacher",
    text: "Your own caseload of students only.",
  },
  {
    id: "parent",
    group: "Families & learners",
    name: "Parent",
    text: "Only your own child's progress and sessions.",
  },
  {
    id: "student",
    group: "Families & learners",
    name: "Student / trainee",
    text: "Your own goals, sessions and milestones.",
  },
  {
    id: "admin",
    group: "Administration",
    name: "System administrator",
    text: "System health and access. No beneficiary records.",
  },
];
const roleGroups = ["Management staff", "Families & learners", "Administration"];
const AVATAR = {
  director: "SD",
  "project-head": "PH",
  coordinator: "MC",
  reporter: "RO",
  teacher: "TE",
  parent: "PA",
  student: "ST",
  admin: "AD",
};
export default function App() {
  const [user, setUser] = useState(null),
    [booted, setBooted] = useState(false),
    [bootError, setBootError] = useState(""),
    [page, setPage] = useState(() => location.hash.slice(1) || "overview");
  const [filters, setFilters] = useState(initialFilters),
    [revision, setRevision] = useState(0),
    [roleDialog, setRoleDialog] = useState(false),
    [help, setHelp] = useState(false),
    [navOpen, setNavOpen] = useState(false);
  const [profileId, setProfileId] = useState(null),
    [exportSpec, setExportSpec] = useState(null),
    [metric, setMetric] = useState("total"),
    [search, setSearch] = useState("");
  const [switching, setSwitching] = useState(false),
    [roleError, setRoleError] = useState("");
  useEffect(() => {
    api("/api/session")
      .then((x) => setUser(x.user))
      .catch(() => {})
      .finally(() => setBooted(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    const nav = navFor(user);
    if (!nav.some((p) => p.id === page)) {
      setPage(nav[0].id);
      location.hash = nav[0].id;
    }
  }, [user]);
  useEffect(() => {
    const onHash = () => setPage(location.hash.slice(1) || "overview");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  const options = useResource(
    user ? "/api/options" : "/api/session",
    user?.role,
  );
  const go = (id) => {
    setPage(id);
    location.hash = id;
    setNavOpen(false);
  };
  async function switchRole(role) {
    setSwitching(true);
    setRoleError("");
    try {
      const x = await api("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setUser(x.user);
      setFilters(initialFilters);
      setSearch("");
      setMetric("total");
      setProfileId(null);
      setExportSpec(null);
      setRoleDialog(false);
      go(navFor(x.user)[0].id);
    } catch (e) {
      setRoleError(e.message);
    } finally {
      setSwitching(false);
    }
  }
  const context = {
    user,
    filters,
    revision: user?.role + "-" + revision,
    options: options.data,
    onProject: (id) => {
      setFilters((f) => ({ ...f, project: id }));
      go("projects");
    },
    onBeneficiary: setProfileId,
    onDrill: (id) => {
      setMetric(id);
      setSearch("");
      go("beneficiaries");
    },
    onExport: (report = "overview", group = "project", id, metric) =>
      setExportSpec({ report, group, id, metric }),
  };
  if (!user)
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-brand">
            <img className="brand-logo login-logo" src="/sristi-logo.jpg" alt="Sristi Foundation" />
            <small>Enabling Inclusion · Tamil Nadu</small>
          </div>
          <h1>Who's signing in?</h1>
          <p className="login-intro">
            Choose how you'd like to use the portal. These are fictional demo
            personas for reviewing what each kind of user sees — they do not
            authenticate you to any real system.
          </p>
          {!booted ? (
            <p role="status" className="login-wait">
              <span className="spinner" /> Preparing the portal…
            </p>
          ) : (
            roleGroups.map((grp) => (
              <div className="login-group" key={grp}>
                <div className="login-group-label">{grp}</div>
                <div className="login-role-grid">
                  {roles
                    .filter((r) => r.group === grp)
                    .map((r) => (
                      <button
                        key={r.id}
                        className="login-role"
                        disabled={switching}
                        onClick={() => switchRole(r.id)}
                      >
                        <span className="avatar">{AVATAR[r.id]}</span>
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.text}</small>
                        </span>
                        <Icon name="arrow" size={16} />
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
          {(roleError || bootError) && (
            <p role="alert" className="error-text">
              {roleError || bootError}
            </p>
          )}
          <div className="login-foot">
            <Icon name="shield" size={15} />
            <span>Read-only demo · all records are fictional</span>
          </div>
        </div>
      </div>
    );
  return (
    <div className="app-shell">
      {navOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside className={"sidebar " + (navOpen ? "open" : "")}>
        <a
          className="brand"
          href={"#" + navFor(user)[0].id}
          onClick={() => go(navFor(user)[0].id)}
        >
          <img className="brand-logo" src="/sristi-logo.jpg" alt="Sristi Foundation" />
        </a>
        <div className="workspace-label">{WORKSPACE_LABEL[user.scope]}</div>
        <nav aria-label="Main navigation">
          {navFor(user).map((p) => (
            <button
              key={p.id}
              className={"nav-item " + (page === p.id ? "selected" : "")}
              aria-current={page === p.id ? "page" : undefined}
              onClick={() => go(p.id)}
            >
              <Icon name={p.icon} />
              <span>{p.name}</span>
              {page === p.id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-art">
            <Icon name="leaf" size={56} />
          </div>
          <span>ROOTED IN INCLUSION</span>
          <h3>
            Small steps.
            <br />
            Meaningful change.
          </h3>
          <p>A shared view of the people and programs that matter.</p>
        </div>
        {user.scope === "org" && (
          <button
            className="nav-item help-button"
            onClick={() => setHelp(true)}
          >
            <Icon name="help" />
            Help & guidance
          </button>
        )}
        <div className="sidebar-bottom">
          <Icon name="shield" size={16} />
          <span>Read-only · demo data</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={14} />
            <strong>
              {(navFor(user).find((p) => p.id === page) || navFor(user)[0]).name}
            </strong>
          </div>
          <div className="topbar-actions">
            {user.scope === "org" && (
              <button
                className="top-search"
                onClick={() => {
                  go("beneficiaries");
                  setSearch("");
                }}
                disabled={!user.details}
              >
                <Icon name="search" size={17} />
                <span>Find a beneficiary</span>
              </button>
            )}
            <Status tone="amber">Demo workspace</Status>
            <button
              className="user-menu"
              onClick={() => setRoleDialog(true)}
              aria-label="Switch demo role"
            >
              <span className="avatar">{AVATAR[user.role] || "?"}</span>
              <span>
                <strong>{user.name}</strong>
                <small>{user.label}</small>
              </span>
              <Icon name="down" size={14} />
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="demo-banner">
            <Icon name="shield" size={17} />
            <span>
              <strong>Demo data only.</strong> All records and figures are
              fictional. No production database is connected.
            </span>
            {user.scope === "org" && (
              <button onClick={() => go("connection")}>
                Connection status <Icon name="arrow" size={15} />
              </button>
            )}
            {user.scope === "system" && (
              <button onClick={() => go("admin")}>
                System status <Icon name="arrow" size={15} />
              </button>
            )}
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">SRISTI FOUNDATION · TAMIL NADU</div>
              <h1>{(PAGE_COPY[page] || {}).title || page}</h1>
              <p>{(PAGE_COPY[page] || {}).sub}</p>
            </div>
            <div className="heading-actions">
              {!["connection", "admin", "roles"].includes(page) && (
                <button
                  className="button secondary refresh-button"
                  onClick={() => setRevision((n) => n + 1)}
                >
                  <Icon name="refresh" size={16} />
                  <span>Refresh</span>
                </button>
              )}
              {user.scope === "org" &&
                !["connection", "reports"].includes(page) && (
                  <button
                    className="button primary"
                    onClick={() =>
                      context.onExport(
                        page === "beneficiaries" && user.details
                          ? "beneficiaries"
                          : "overview",
                      )
                    }
                  >
                    <Icon name="download" size={16} />
                    Export report
                  </button>
                )}
            </div>
          </div>
          {user.scope === "org" &&
            !["connection"].includes(page) &&
            (options.loading || options.error ? (
              <LoadState resource={options} />
            ) : (
              options.data?.projects && (
                <Filters
                  filters={filters}
                  options={options.data}
                  user={user}
                  onChange={setFilters}
                />
              )
            ))}
          {user.scope === "org" &&
            options.data?.projects &&
            page === "overview" && <Overview {...context} />}
          {user.scope === "org" &&
            options.data?.projects &&
            page === "projects" && <Projects {...context} />}
          {user.scope === "org" &&
            options.data?.projects &&
            page === "beneficiaries" && (
              <Beneficiaries
                {...context}
                metric={metric}
                setMetric={setMetric}
                search={search}
                setSearch={setSearch}
              />
            )}
          {options.data?.projects &&
            page === "reports" &&
            (user.scope === "org" || user.scope === "caseload") && (
              <Reports {...context} />
            )}
          {page === "connection" && user.scope === "org" && (
            <Connection {...context} />
          )}
          {page === "progress" && user.scope === "self" && (
            <MyProgress {...context} />
          )}
          {page === "sessions" && user.scope === "self" && (
            <MySessions {...context} />
          )}
          {page === "caseload" && user.scope === "caseload" && (
            <MyCaseload {...context} />
          )}
          {(page === "admin" || page === "roles") &&
            user.scope === "system" && <Admin {...context} />}
          <footer className="page-footer">
            <span>
              <i />
              Sristi Foundation · {WORKSPACE_LABEL[user.scope].toLowerCase()}
            </span>
            <span>
              Demo snapshot: 30 Oct 2026 · Source sync status: unknown
            </span>
          </footer>
        </main>
      </div>
      {roleDialog && (
        <Dialog title="Switch who you are" onClose={() => setRoleDialog(false)}>
          <p className="dialog-intro">
            These are fictional personas for reviewing what each kind of user
            sees. They do not authenticate you to the foundation’s systems.
          </p>
          {roleGroups.map((grp) => (
            <div className="role-group" key={grp}>
              <div className="role-group-label">{grp}</div>
              <div className="role-list">
                {roles
                  .filter((r) => r.group === grp)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => switchRole(r.id)}
                      disabled={switching}
                      className={r.id === user.role ? "current" : ""}
                    >
                      <span>
                        <strong>{r.name}</strong>
                        <small>{r.text}</small>
                      </span>
                      {r.id === user.role ? (
                        <Icon name="check" />
                      ) : (
                        <Icon name="arrow" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {roleError && (
            <p role="alert" className="error-text">
              {roleError}
            </p>
          )}
        </Dialog>
      )}
      {help && (
        <Dialog
          title="Your management workspace"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <h3>Start with a question</h3>
            <p>
              Choose a project, period or location. Open a KPI to review the
              people behind that count, or use Reports & explore to choose a
              prepared report and breakdown.
            </p>
            <h3>Understand the dates</h3>
            <p>
              Registered and active counts describe the 30 October demo
              snapshot. New registrations and completed services use the
              selected period. The six-month chart is clearly labelled as
              separate context.
            </p>
            <h3>Take a report to your meeting</h3>
            <p>
              Preview an Excel or PDF report. Both use your current filters and
              permissions. All demo files are labelled as fictional.
            </p>
            <h3>Keep source records safe</h3>
            <p>
              This app has no source-record editing actions. Production
              reporting needs a verified database schema and approved user
              access before activation.
            </p>
          </div>
        </Dialog>
      )}
      {profileId && (
        <ProfileDialog
          id={profileId}
          {...context}
          onClose={() => setProfileId(null)}
        />
      )}
      {exportSpec && (
        <ExportDialog
          {...context}
          {...exportSpec}
          metric={
            exportSpec.metric ?? (page === "beneficiaries" ? metric : "total")
          }
          search={page === "beneficiaries" ? search : ""}
          onClose={() => setExportSpec(null)}
        />
      )}
    </div>
  );
}
function Filters({ filters, options, user, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const update = (key, value) => onChange((f) => ({ ...f, [key]: value }));
  const period =
    filters.start === "2026-10-01" && filters.end === "2026-11-01"
      ? "oct"
      : filters.start === "2026-09-01" && filters.end === "2026-10-01"
        ? "sep"
        : filters.start === "2026-07-01" && filters.end === "2026-10-01"
          ? "quarter"
          : "custom";
  const select = (key, label, values) => (
    <label className="filter-field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={filters[key] || "all"}
        onChange={(e) => update(key, e.target.value)}
      >
        <option value="all">
          All {label.toLowerCase()}
          {label === "Status" ? "es" : "s"}
        </option>
        {values.map((x) => (
          <option key={x.id || x} value={x.id || x}>
            {x.name || x}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="filters" aria-label="Dashboard filters">
      <div className="filter-main">
        <div className="filter-symbol">
          <Icon name="filter" />
        </div>
        {select("project", "Project", options.projects)}
        <label className="filter-field">
          <span>Reporting period</span>
          <select
            aria-label="Reporting period"
            value={period}
            onChange={(e) => {
              const ranges = {
                oct: ["2026-10-01", "2026-11-01"],
                sep: ["2026-09-01", "2026-10-01"],
                quarter: ["2026-07-01", "2026-10-01"],
              };
              if (ranges[e.target.value])
                onChange((f) => ({
                  ...f,
                  start: ranges[e.target.value][0],
                  end: ranges[e.target.value][1],
                }));
              else setExpanded(true);
            }}
          >
            <option value="oct">October 2026</option>
            <option value="sep">September 2026</option>
            <option value="quarter">Jul–Sep 2026</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        {select("district", "District", options.districts)}
        {select("status", "Status", ["Active", "Inactive"])}
        <button
          className={"button text filter-toggle " + (expanded ? "active" : "")}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="filter" size={16} />
          More filters
        </button>
      </div>
      {expanded && (
        <div className="filter-extra">
          {select("age", "Age group", ["0–5", "6–17", "18–29", "30+"])}
          {select("gender", "Gender", ["Female", "Male"])}
          {select("support", "Support need", options.supports)}
          {user.details && select("worker", "Worker", options.workers)}
          <label className="filter-field">
            <span>Start date</span>
            <input
              type="date"
              aria-label="Start date"
              value={filters.start}
              onChange={(e) => update("start", e.target.value)}
            />
          </label>
          <label className="filter-field">
            <span>End date (exclusive)</span>
            <input
              type="date"
              aria-label="End date (exclusive)"
              value={filters.end}
              onChange={(e) => update("end", e.target.value)}
            />
          </label>
          <button
            className="button text"
            onClick={() => onChange(initialFilters)}
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}
