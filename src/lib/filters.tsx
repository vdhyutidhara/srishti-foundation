"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface Filters {
  period: "month" | "quarter" | "year";
  district: string;
}

interface FilterContextType {
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
}

const FilterContext = createContext<FilterContextType>({
  filters: { period: "month", district: "" },
  setFilters: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>({ period: "month", district: "" });
  const setFilters = (f: Partial<Filters>) => setFiltersState((prev) => ({ ...prev, ...f }));
  return <FilterContext.Provider value={{ filters, setFilters }}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  return useContext(FilterContext);
}

export function periodToSql(period: Filters["period"]): string {
  switch (period) {
    case "month":   return "DATEADD(MONTH, -1, GETDATE())";
    case "quarter": return "DATEADD(MONTH, -3, GETDATE())";
    case "year":    return "DATEADD(YEAR, -1, GETDATE())";
  }
}
