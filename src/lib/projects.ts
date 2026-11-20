export interface ProjectMeta {
  id: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

// Known programmes (su_program values in serviceuser_mstr). `id` equals the
// program name so the UI filter value maps straight to a SQL predicate.
export const PROJECTS: ProjectMeta[] = [
  { id: "MTP", name: "MTP", color: "#4c7a5a", description: "Community-based mobile therapy services.", icon: "people" },
  { id: "EIC", name: "EIC", color: "#527a9e", description: "Early Intervention Centre.", icon: "people" },
  { id: "Sristi Village", name: "Sristi Village", color: "#6b9c4a", description: "Residential farm and inclusion community.", icon: "leaf" },
  { id: "Special School", name: "Special School", color: "#b08848", description: "Special education programme.", icon: "reports" },
  { id: "Jeevan", name: "Jeevan", color: "#7d6bb0", description: "Livelihood and life-skills programme.", icon: "people" },
  { id: "Fellowship", name: "Fellowship", color: "#c2683f", description: "Inclusive fellowship programme.", icon: "people" },
];

const PALETTE = [
  "#4c7a5a", "#527a9e", "#6b9c4a", "#b08848",
  "#7d6bb0", "#c2683f", "#3f8f8a", "#a65a7e",
];

export function projectMeta(name: string, idx = 0): ProjectMeta {
  const known = PROJECTS.find(
    (p) => p.name.toLowerCase() === (name || "").toLowerCase(),
  );
  return (
    known || {
      id: name,
      name,
      color: PALETTE[idx % PALETTE.length],
      description: "",
      icon: "people",
    }
  );
}
