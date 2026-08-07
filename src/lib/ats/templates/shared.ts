import type { JsonResume } from "@/lib/ats/jsonresume";
import type { VariantLayout, VariantOpts } from "./Variants";

export type TemplateId =
  // Core (kept)
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
  // Reactive Resume–inspired open layouts (distinct structures, not accent aliases)
  | "azurill"
  | "bronzor"
  | "chikorita"
  | "ditto"
  | "gengar"
  | "glalie"
  | "kakuna"
  | "leafish"
  | "nosepass"
  | "onyx"
  | "pikachu"
  | "rhyhorn"
  // Additional MPI layout families
  | "slate_rail"
  | "navy_masthead"
  | "coral_split"
  | "mint_spine"
  | "ink_dense"
  | "parchment"
  | "skyline"
  | "graphite"
  | "orchid"
  | "amber_folio"
  | "cedar"
  | "polar";

export type TemplateCategory =
  | "Classic"
  | "Modern"
  | "Sidebar"
  | "Compact"
  | "Creative"
  | "Executive"
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
  accent: string;
  /** When set, rendered via VariantDocument (not a core hand-tuned file). */
  variant?: VariantOpts;
}[] = [
  // —— Classic ——
  {
    id: "classic",
    name: "Classic ATS",
    blurb: "Single column, clear headings — safest for ATS parsers.",
    category: "Classic",
    accent: "#0f766e",
  },
  {
    id: "clean",
    name: "Clean air",
    blurb: "Lots of whitespace, quiet slate type — consulting / PM.",
    category: "Classic",
    accent: "#64748b",
  },
  {
    id: "azurill",
    name: "Azurill",
    blurb: "RR-inspired calm single column with soft blue rules.",
    category: "Classic",
    accent: "#2563eb",
    variant: { title: "Azurill", accent: "#2563eb", layout: "single" },
  },
  {
    id: "kakuna",
    name: "Kakuna",
    blurb: "RR-inspired forest single column — skills-forward.",
    category: "Classic",
    accent: "#15803d",
    variant: { title: "Kakuna", accent: "#15803d", layout: "single" },
  },
  {
    id: "nosepass",
    name: "Nosepass",
    blurb: "RR-inspired centered header with formal rules.",
    category: "Classic",
    accent: "#57534e",
    variant: { title: "Nosepass", accent: "#57534e", layout: "centered" },
  },
  {
    id: "parchment",
    name: "Parchment",
    blurb: "Warm paper tone, classic rules — academic applications.",
    category: "Classic",
    accent: "#92400e",
    variant: {
      title: "Parchment",
      accent: "#92400e",
      layout: "single",
      pageBg: "#fffbeb",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },

  // —— Modern ——
  {
    id: "modern",
    name: "Modern band",
    blurb: "Bold name band and teal rules — contemporary product roles.",
    category: "Modern",
    accent: "#0369a1",
  },
  {
    id: "glalie",
    name: "Glalie",
    blurb: "RR-inspired ice-blue top bar and crisp sections.",
    category: "Modern",
    accent: "#0284c7",
    variant: { title: "Glalie", accent: "#0284c7", layout: "top-bar" },
  },
  {
    id: "navy_masthead",
    name: "Navy masthead",
    blurb: "Full-width navy header band with white type.",
    category: "Modern",
    accent: "#1e3a5f",
    variant: { title: "Navy masthead", accent: "#1e3a5f", layout: "masthead" },
  },
  {
    id: "skyline",
    name: "Skyline",
    blurb: "Wide cyan banner header for product / growth roles.",
    category: "Modern",
    accent: "#0891b2",
    variant: { title: "Skyline", accent: "#0891b2", layout: "banner" },
  },
  {
    id: "leafish",
    name: "Leafish",
    blurb: "RR-inspired date-spine timeline for career scanning.",
    category: "Modern",
    accent: "#16a34a",
    variant: { title: "Leafish", accent: "#16a34a", layout: "timeline" },
  },
  {
    id: "timeline",
    name: "Date spine",
    blurb: "Dates lead each role on a left spine for quick scanning.",
    category: "Modern",
    accent: "#1d4ed8",
  },

  // —— Sidebar ——
  {
    id: "sidebar",
    name: "Ink sidebar",
    blurb: "Dark teal rail for contact/skills; cream main column.",
    category: "Sidebar",
    accent: "#115e59",
  },
  {
    id: "bronzor",
    name: "Bronzor",
    blurb: "RR-inspired bronze left rail — contact + skills.",
    category: "Sidebar",
    accent: "#b45309",
    variant: {
      title: "Bronzor",
      accent: "#b45309",
      layout: "left-rail",
      railBg: "#78350f",
      railColor: "#fff7ed",
    },
  },
  {
    id: "gengar",
    name: "Gengar",
    blurb: "RR-inspired violet rail — creative / design portfolios.",
    category: "Sidebar",
    accent: "#6d28d9",
    variant: {
      title: "Gengar",
      accent: "#6d28d9",
      layout: "left-rail",
      railBg: "#2e1065",
      railColor: "#ede9fe",
    },
  },
  {
    id: "slate_rail",
    name: "Slate rail",
    blurb: "Cool slate left column with high-contrast body.",
    category: "Sidebar",
    accent: "#334155",
    variant: {
      title: "Slate rail",
      accent: "#334155",
      layout: "left-rail",
      railBg: "#1e293b",
      railColor: "#f8fafc",
    },
  },
  {
    id: "polar",
    name: "Polar right",
    blurb: "Ice-gray right rail — skills and education on the side.",
    category: "Sidebar",
    accent: "#0e7490",
    variant: {
      title: "Polar",
      accent: "#0e7490",
      layout: "right-rail",
      railBg: "#ecfeff",
      railColor: "#164e63",
    },
  },

  // —— Compact ——
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
    id: "ditto",
    name: "Ditto",
    blurb: "RR-inspired ultra-dense single column for veterans.",
    category: "Compact",
    accent: "#4b5563",
    variant: { title: "Ditto", accent: "#4b5563", layout: "dense" },
  },
  {
    id: "ink_dense",
    name: "Ink dense",
    blurb: "Near-black dense bars — maximize content per page.",
    category: "Compact",
    accent: "#18181b",
    variant: { title: "Ink dense", accent: "#18181b", layout: "dense" },
  },
  {
    id: "graphite",
    name: "Graphite",
    blurb: "Compact charcoal rules — ops and SRE profiles.",
    category: "Compact",
    accent: "#3f3f46",
    variant: { title: "Graphite", accent: "#3f3f46", layout: "dense" },
  },

  // —— Creative ——
  {
    id: "dual",
    name: "Split folio",
    blurb: "True two-column skills + experience (still text-only).",
    category: "Creative",
    accent: "#7c3aed",
  },
  {
    id: "chikorita",
    name: "Chikorita",
    blurb: "RR-inspired green split — experience left, meta right.",
    category: "Creative",
    accent: "#16a34a",
    variant: { title: "Chikorita", accent: "#16a34a", layout: "split" },
  },
  {
    id: "pikachu",
    name: "Pikachu",
    blurb: "RR-inspired amber banner — energetic creative roles.",
    category: "Creative",
    accent: "#ca8a04",
    variant: { title: "Pikachu", accent: "#ca8a04", layout: "banner" },
  },
  {
    id: "coral_split",
    name: "Coral split",
    blurb: "Warm coral two-column for marketing / community.",
    category: "Creative",
    accent: "#e11d48",
    variant: { title: "Coral split", accent: "#e11d48", layout: "split" },
  },
  {
    id: "orchid",
    name: "Orchid",
    blurb: "Centered orchid accent — design and brand roles.",
    category: "Creative",
    accent: "#a21caf",
    variant: { title: "Orchid", accent: "#a21caf", layout: "centered" },
  },
  {
    id: "mint_spine",
    name: "Mint spine",
    blurb: "Mint timeline spine for career storytelling.",
    category: "Creative",
    accent: "#0d9488",
    variant: { title: "Mint spine", accent: "#0d9488", layout: "timeline" },
  },

  // —— Executive ——
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
    id: "rhyhorn",
    name: "Rhyhorn",
    blurb: "RR-inspired heavy serif executive — board-ready.",
    category: "Executive",
    accent: "#7c2d12",
    variant: {
      title: "Rhyhorn",
      accent: "#7c2d12",
      layout: "serif",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },
  {
    id: "amber_folio",
    name: "Amber folio",
    blurb: "Amber masthead for senior IC / director packages.",
    category: "Executive",
    accent: "#b45309",
    variant: {
      title: "Amber folio",
      accent: "#b45309",
      layout: "masthead",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },
  {
    id: "cedar",
    name: "Cedar",
    blurb: "Deep cedar single column — quiet senior leadership.",
    category: "Executive",
    accent: "#5c4033",
    variant: {
      title: "Cedar",
      accent: "#5c4033",
      layout: "serif",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },

  // —— Tech ——
  {
    id: "tech",
    name: "Stack card",
    blurb: "Mono section tags and chip-like skills for engineering.",
    category: "Tech",
    accent: "#0e7490",
  },
  {
    id: "onyx",
    name: "Onyx",
    blurb: "RR-inspired mono tech column — platform / SRE.",
    category: "Tech",
    accent: "#0ea5e9",
    variant: {
      title: "Onyx",
      accent: "#0ea5e9",
      layout: "mono",
      font: "Courier",
      fontBold: "Courier-Bold",
    },
  },
];

/** Category display order in the builder gallery. */
export const TEMPLATE_CATEGORY_ORDER: TemplateCategory[] = [
  "Classic",
  "Modern",
  "Sidebar",
  "Compact",
  "Creative",
  "Executive",
  "Tech",
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

// Re-export for consumers that only import shared
export type { VariantLayout, VariantOpts };
