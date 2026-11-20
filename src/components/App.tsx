"use client";
import { useEffect, useState } from "react";
import { api, useResource } from "@/lib/client";
import type {
  User,
  Filters as FiltersType,
  Options,
  Context,
  ExportReport,
  Role,
  Scope,
} from "@/lib/types";
import { Icon, Dialog, LoadState } from "./ui";
import {
  Overview,
  Projects,
  Beneficiaries,
  Reports,
  ProfileDialog,
  ExportDialog,
  Admin,
  Workers,
  Alerts,
  Help,
} from "./views";

interface NavItem {
  id: string;
  name: string;
  icon: string;
}

const NAV: Record<Scope, NavItem[]> = {
  org: [
    { id: "overview", name: "Overview", icon: "overview" },
    { id: "projects", name: "Projects", icon: "projects" },
    { id: "beneficiaries", name: "Beneficiaries", icon: "people" },
    { id: "workers", name: "Worker activity", icon: "activity" },
    { id: "alerts", name: "Alerts & actions", icon: "alert" },
    { id: "reports", name: "Reports & explore", icon: "reports" },
  ],
  system: [
    { id: "admin", name: "System", icon: "home" },
    { id: "roles", name: "Access & roles", icon: "shield" },
  ],
};

const WORKSPACE_LABEL: Record<Scope, string> = {
  org: "MANAGEMENT WORKSPACE",
  system: "ADMINISTRATION",
};

const navFor = (user: User | null) => NAV[user?.scope ?? "org"] || NAV.org;

const PAGE_COPY: Record<string, { title: string; sub?: string }> = {
  overview: {
    title: "A clearer picture of your impact.",
    sub: "Every person. Every program. One connected view.",
  },
  projects: {
    title: "Projects",
    sub: "See how each project is reaching and supporting people.",
  },
  beneficiaries: {
    title: "Beneficiaries",
    sub: "Find the people behind the numbers, within your permitted scope.",
  },
  workers: {
    title: "Worker activity",
    sub: "Caseload, visits and follow-ups by field worker.",
  },
  alerts: {
    title: "Alerts & actions",
    sub: "What needs attention first — overdue, due and incomplete.",
  },
  reports: {
    title: "Reports & explore",
    sub: "Your questions, answered. No dashboard-building skills needed.",
  },
  admin: {
    title: "System",
    sub: "Keep the platform healthy and access rules sound.",
  },
  help: {
    title: "How to use this dashboard",
    sub: "A simple guide for everyday use — no computer skills needed.",
  },
  roles: {
    title: "Access & roles",
    sub: "Who can see and do what across the portal.",
  },
};

const initialFilters: FiltersType = {
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

interface RoleDef {
  id: Role;
  group: string;
  name: string;
  text: string;
}

const roles: RoleDef[] = [
  {
    id: "director",
    group: "Management staff",
    name: "Director",
    text: "All projects, profiles and reports.",
  },
  {
    id: "reporter",
    group: "Management staff",
    name: "Reporting officer",
    text: "Aggregate views and reports. No profiles.",
  },
  {
    id: "admin",
    group: "Administration",
    name: "System administrator",
    text: "System health and access. No beneficiary records.",
  },
];
const roleGroups = ["Management staff", "Administration"];

const AVATAR: Record<string, string> = {
  director: "SD",
  reporter: "RO",
  admin: "AD",
};

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [booted, setBooted] = useState(false),
    [bootError] = useState(""),
    [page, setPage] = useState<string>(() =>
      typeof location !== "undefined" ? location.hash.slice(1) || "overview" : "overview",
    );
  const [filters, setFilters] = useState<FiltersType>(initialFilters),
    [revision, setRevision] = useState(0),
    [roleDialog, setRoleDialog] = useState(false),
    [navOpen, setNavOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null),
    [exportSpec, setExportSpec] = useState<{
      report: ExportReport;
      group?: string;
      id?: string;
      metric?: string;
    } | null>(null),
    [metric, setMetric] = useState("total"),
    [search, setSearch] = useState("");
  const [switching, setSwitching] = useState(false),
    [roleError, setRoleError] = useState("");

  useEffect(() => {
    api<{ user: User | null }>("/api/session")
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const onHash = () => setPage(location.hash.slice(1) || "overview");
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const options = useResource<Options>(
    user ? "/api/options" : "/api/session",
    user?.role ?? "",
  );

  const go = (id: string) => {
    setPage(id);
    location.hash = id;
    setNavOpen(false);
  };

  async function switchRole(role: Role) {
    setSwitching(true);
    setRoleError("");
    try {
      const x = await api<{ user: User }>("/api/session", {
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
      setRoleError((e as Error).message);
    } finally {
      setSwitching(false);
    }
  }

  const context: Context = {
    user: user as User,
    filters,
    revision: (user?.role ?? "") + "-" + revision,
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo login-logo"
              src="/sristi-logo.jpg"
              alt="Sristi Foundation"
            />
            <small>Enabling Inclusion · Tamil Nadu</small>
          </div>
          <h1>Who&apos;s signing in?</h1>
          <p className="login-intro">
            Choose how you&apos;d like to use the portal. These personas control
            what each kind of user can see across the read-only reporting data.
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
            <span>Read-only reporting · no source edits</span>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
        {user.scope === "org" && (
          <button
            className={"nav-item help-button " + (page === "help" ? "selected" : "")}
            aria-current={page === "help" ? "page" : undefined}
            onClick={() => go("help")}
          >
            <Icon name="help" />
            Help & guidance
          </button>
        )}
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
              {navFor(user).find((p) => p.id === page)?.name ||
                (page === "help" ? "Help & guidance" : navFor(user)[0].name)}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className="user-menu"
              onClick={() => setRoleDialog(true)}
              aria-label="Switch role"
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
          <div className="page-heading">
            <div>
              <div className="eyebrow">SRISTI FOUNDATION · TAMIL NADU</div>
              <h1>{(PAGE_COPY[page] || {}).title || page}</h1>
              <p>{(PAGE_COPY[page] || {}).sub}</p>
            </div>
            <div className="heading-actions">
              {!["admin", "roles", "help"].includes(page) && (
                <button
                  className="button secondary refresh-button"
                  onClick={() => setRevision((n) => n + 1)}
                >
                  <Icon name="refresh" size={16} />
                  <span>Refresh</span>
                </button>
              )}
              {user.scope === "org" &&
                !["reports", "help"].includes(page) && (
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
            page !== "help" &&
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
          {user.scope === "org" && options.data?.projects && page === "overview" && (
            <Overview {...context} />
          )}
          {user.scope === "org" && options.data?.projects && page === "projects" && (
            <Projects {...context} />
          )}
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
          {user.scope === "org" && options.data?.projects && page === "workers" && (
            <Workers {...context} />
          )}
          {user.scope === "org" && options.data?.projects && page === "alerts" && (
            <Alerts {...context} />
          )}
          {options.data?.projects && page === "reports" && user.scope === "org" && (
            <Reports {...context} />
          )}
          {(page === "admin" || page === "roles") && user.scope === "system" && (
            <Admin {...context} />
          )}
          {page === "help" && user.scope === "org" && <Help />}
        </main>
      </div>
      {roleDialog && (
        <Dialog title="Switch who you are" onClose={() => setRoleDialog(false)}>
          <p className="dialog-intro">
            These personas control what each kind of user can see across the
            read-only reporting data.
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
      {profileId && (
        <ProfileDialog id={profileId} {...context} onClose={() => setProfileId(null)} />
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

function Filters({
  filters,
  options,
  user,
  onChange,
}: {
  filters: FiltersType;
  options: Options;
  user: User;
  onChange: React.Dispatch<React.SetStateAction<FiltersType>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = (key: keyof FiltersType, value: string) =>
    onChange((f) => ({ ...f, [key]: value }));
  const period =
    filters.start === "2026-10-01" && filters.end === "2026-11-01"
      ? "oct"
      : filters.start === "2026-09-01" && filters.end === "2026-10-01"
        ? "sep"
        : filters.start === "2026-07-01" && filters.end === "2026-10-01"
          ? "quarter"
          : "custom";
  const select = (
    key: keyof FiltersType,
    label: string,
    values: (string | { id: string; name: string })[],
  ) => (
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
          <option
            key={typeof x === "string" ? x : x.id}
            value={typeof x === "string" ? x : x.id}
          >
            {typeof x === "string" ? x : x.name}
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
              const ranges: Record<string, [string, string]> = {
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
          <button className="button text" onClick={() => onChange(initialFilters)}>
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}
