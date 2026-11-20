export type Scope = "org";
export type Role = "director" | "reporter";

export interface User {
  role: Role;
  name: string;
  label: string;
  scope: Scope;
  details: boolean;
}

export interface Filters {
  project: string;
  district: string;
  start: string;
  end: string;
  status: string;
  gender: string;
  age: string;
  worker: string;
  support: string;
  [key: string]: string;
}

export interface ProjectOption {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Options {
  projects: ProjectOption[];
  districts: string[];
  supports: string[];
  workers: string[];
}

export type ExportReport =
  | "overview"
  | "beneficiaries"
  | "profile"
  | "reach"
  | "services"
  | "followups"
  | "quality";

export interface Context {
  user: User;
  filters: Filters;
  revision: string;
  options?: Options;
  onProject: (id: string) => void;
  onBeneficiary: (id: string | null) => void;
  onDrill: (id: string) => void;
  onExport: (
    report?: ExportReport,
    group?: string,
    id?: string,
    metric?: string,
  ) => void;
}
