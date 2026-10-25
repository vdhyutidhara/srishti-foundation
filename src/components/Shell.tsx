"use client";
import { FilterProvider } from "@/lib/filters";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          {children}
        </div>
      </div>
    </FilterProvider>
  );
}
