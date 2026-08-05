import type { JsonResume } from "@/lib/ats/jsonresume";

export type TemplateId =
  | "classic"
  | "modern"
  | "compact"
  | "sidebar"
  | "executive"
  | "clean"
  | "timeline"
  | "dual"
  | "tech"
  | "professional"
  | "mono"
  | "kakuna"
  | "charmander"
  | "meowth"
  | "scizor";

export type TemplateCategory =
  | "ATS single"
  | "Two-column"
  | "Sidebar"
  | "Executive"
  | "Compact"
  | "Tech";

type Basics = NonNullable<JsonResume["basics"]>;
type Work = NonNullable<JsonResume["work"]>[number];
type Education = NonNullable<JsonResume["education"]>[number];
type Skill = NonNullable<JsonResume["skills"]>[number];

export const TEMPLATE_META: {
  id: TemplateId;
  name: string;
  blurb: string;
  category: TemplateCategory;
  /** CSS accent for thumbnail chrome — not a separate template */
  accent: string;
}[] = [
  {
    id: "classic",
    name: "Classic ATS",
    blurb: "Single column, clear headings — safest for ATS parsers.",
    category: "ATS single",
    accent: "#0f766e",
  },
  {
    id: "modern",
    name: "Modern band",
    blurb: "Bold name band and teal rules — contemporary product roles.",
    category: "ATS single",
    accent: "#0369a1",
  },
  {
    id: "clean",
    name: "Clean air",
    blurb: "Lots of whitespace, quiet slate type — consulting / PM.",
    category: "ATS single",
    accent: "#64748b",
  },
  {
    id: "compact",
    name: "Compact dense",
    blurb: "Tighter spacing for longer careers on one page.",
    category: "Compact",
    accent: "#b45309",
  },
  {
    id: "mono",
    name: "Terminal mono",
    blurb: "Courier dense layout when every line must fit.",
    category: "Compact",
    accent: "#111827",
  },
  {
    id: "sidebar",
    name: "Ink sidebar",
    blurb: "Dark teal rail for contact/skills; cream main column.",
    category: "Sidebar",
    accent: "#115e59",
  },
  {
    id: "dual",
    name: "Split folio",
    blurb: "True two-column skills + experience (still text-only).",
    category: "Two-column",
    accent: "#7c3aed",
  },
  {
    id: "timeline",
    name: "Date spine",
    blurb: "Dates lead each role on a left spine for quick scanning.",
    category: "Two-column",
    accent: "#1d4ed8",
  },
  {
    id: "executive",
    name: "Executive serif",
    blurb: "Wide name block, copper rules — leadership / finance.",
    category: "Executive",
    accent: "#9a3412",
  },
  {
    id: "professional",
    name: "Boardroom",
    blurb: "Serif typography for formal corporate applications.",
    category: "Executive",
    accent: "#44403c",
  },
  {
    id: "tech",
    name: "Stack card",
    blurb: "Mono section tags and chip-like skills for engineering.",
    category: "Tech",
    accent: "#0e7490",
  },
  {
    id: "kakuna",
    name: "Forest single",
    blurb: "Green-accent single column with skills up front.",
    category: "ATS single",
    accent: "#15803d",
  },
  {
    id: "charmander",
    name: "Ember sidebar",
    blurb: "Warm orange rail — creative ops and startup roles.",
    category: "Sidebar",
    accent: "#ea580c",
  },
  {
    id: "meowth",
    name: "Rose split",
    blurb: "Pink-accent split with projects in the rail.",
    category: "Two-column",
    accent: "#be185d",
  },
  {
    id: "scizor",
    name: "Crimson dual",
    blurb: "Bold red dual-column for sales / GTM energy.",
    category: "Two-column",
    accent: "#dc2626",
  },
];

export function contactLine(basics: Basics): string {
  return [basics.email, basics.phone, basics.location?.city, basics.url]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join("  ·  ");
}

export function workRange(w: Work): string {
  const start = w.startDate || "";
  const end = w.endDate || "Present";
  if (!start && !end) return "";
  if (!start) return end;
  return `${start} – ${end}`;
}

export function eduRange(e: Education): string {
  const start = e.startDate || "";
  const end = e.endDate || "";
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}

export function skillLine(s: Skill): string {
  const keywords = (s.keywords || []).filter(Boolean).join(", ");
  if (s.name && keywords) return `${s.name}: ${keywords}`;
  return s.name || keywords;
}

export type NormalizedResume = JsonResume & {
  basics: NonNullable<JsonResume["basics"]>;
};

export function ensureResume(data: JsonResume | null | undefined): NormalizedResume {
  return {
    ...data,
    basics: data?.basics || { name: "Candidate" },
    work: data?.work || [],
    education: data?.education || [],
    skills: data?.skills || [],
    projects: data?.projects || [],
  };
}
