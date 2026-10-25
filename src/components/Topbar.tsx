"use client";
import { usePathname } from "next/navigation";
import { useFilters } from "@/lib/filters";

const PAGE_TITLES: Record<string, string> = {
  "/": "Management Overview",
  "/beneficiaries": "All Beneficiaries",
  "/projects": "Project Dashboards",
  "/service-delivery": "Service Delivery",
  "/outcomes": "Outcomes & Progress",
  "/workers": "Worker Activity",
  "/data-quality": "Data Quality",
  "/alerts": "Alerts & Action List",
  "/reports": "Download Reports",
};

const DISTRICTS = ["", "Krishnagiri", "Dharmapuri", "Vellore", "Salem", "Tirupattur"];

export default function Topbar() {
  const path = usePathname();
  const { filters, setFilters } = useFilters();
  const title = PAGE_TITLES[path] ?? "Dashboard";

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <select
        className="tsel"
        value={filters.period}
        onChange={(e) => setFilters({ period: e.target.value as "month" | "quarter" | "year" })}
      >
        <option value="month">This Month</option>
        <option value="quarter">This Quarter</option>
        <option value="year">This Year</option>
      </select>
      <select
        className="tsel"
        value={filters.district}
        onChange={(e) => setFilters({ district: e.target.value })}
      >
        {DISTRICTS.map((d) => (
          <option key={d} value={d}>{d || "All Districts"}</option>
        ))}
      </select>
      <div className="topbar-right">
        <span className="sync-info">Live data</span>
        <button className="btn btn-g btn-sm" onClick={() => window.location.reload()}>↻ Refresh</button>
        <a href="/reports" className="btn btn-p btn-sm">⬇ Export</a>
      </div>
    </div>
  );
}
