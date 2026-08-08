import type { JsonResume } from "@/lib/ats/jsonresume";
import type { VariantLayout, VariantOpts } from "./Variants";

/**
 * Template registry — one entry per distinct layout structure.
 * Color-only clones were culled (prior azurill/kakuna/bronzor/gengar/… shells).
 *
 * Groups (layout intent):
 * - Classic: single-column ATS / airy / centered / ATS rule-lines
 * - Modern: header band / date-spine timeline / contact strip
 * - Sidebar: left ink rail / right polar rail
 * - Compact: dense Helvetica / terminal mono
 * - Creative: two-column split / card sections / stacked blocks / project grid
 * - Executive: serif leadership / boardroom / pull-quote lead
 * - Tech: chip/stack engineering
 */
export type TemplateId =
  // Core hand-tuned
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
  // Distinct structural variants (not recolors)
  | "nosepass"
  | "polar"
  | "ats_lines"
  | "header_strip"
  | "cards"
  | "blocks"
  | "grid_projects"
  | "pull_quote"
  // Expanded gallery (~20 additional layout shells)
  | "slate_ats"
  | "ivory_classic"
  | "navy_band"
  | "sky_strip"
  | "ink_rail"
  | "mint_rail"
  | "sand_dense"
  | "code_dense"
  | "folio_split"
  | "amber_cards"
  | "indigo_blocks"
  | "teal_projects"
  | "copper_serif"
  | "stone_board"
  | "quote_lead"
  | "cyan_stack"
  | "forest_timeline"
  | "rose_masthead"
  | "graphite_lines"
  | "ocean_centered";

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
    id: "nosepass",
    name: "Centered formal",
    blurb: "Centered name block with formal rules — academic / research.",
    category: "Classic",
    accent: "#57534e",
    variant: { title: "Centered formal", accent: "#57534e", layout: "centered" },
  },
  {
    id: "ats_lines",
    name: "ATS rule lines",
    blurb: "ALL-CAPS ruled sections and table-like role rows — max parser safety.",
    category: "Classic",
    accent: "#1e293b",
    variant: { title: "ATS rule lines", accent: "#1e293b", layout: "ats-lines" },
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
    id: "timeline",
    name: "Date spine",
    blurb: "Dates lead each role on a left spine for quick scanning.",
    category: "Modern",
    accent: "#1d4ed8",
  },
  {
    id: "header_strip",
    name: "Contact strip",
    blurb: "Thin top contact bar, then single-column body — recruiter-friendly.",
    category: "Modern",
    accent: "#0e7490",
    variant: { title: "Contact strip", accent: "#0e7490", layout: "header-strip" },
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

  // —— Creative ——
  {
    id: "dual",
    name: "Split folio",
    blurb: "True two-column skills + experience (still text-only).",
    category: "Creative",
    accent: "#7c3aed",
  },
  {
    id: "cards",
    name: "Card sections",
    blurb: "Each role in a bordered card — portfolio / product storytelling.",
    category: "Creative",
    accent: "#c2410c",
    variant: { title: "Card sections", accent: "#c2410c", layout: "cards" },
  },
  {
    id: "blocks",
    name: "Stacked blocks",
    blurb: "Tinted section bands stacked full-width — bold creative layouts.",
    category: "Creative",
    accent: "#4338ca",
    variant: { title: "Stacked blocks", accent: "#4338ca", layout: "blocks" },
  },
  {
    id: "grid_projects",
    name: "Project grid",
    blurb: "Experience column + 2-up project cards — IC / maker resumes.",
    category: "Creative",
    accent: "#0f766e",
    variant: { title: "Project grid", accent: "#0f766e", layout: "grid-projects" },
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
    id: "pull_quote",
    name: "Pull-quote lead",
    blurb: "Large summary quote then two-column body — exec narrative.",
    category: "Executive",
    accent: "#7c2d12",
    variant: {
      title: "Pull-quote lead",
      accent: "#7c2d12",
      layout: "pull-quote",
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

  // —— Expanded gallery (JSON Resume / ATS-inspired shells) ——
  {
    id: "slate_ats",
    name: "Slate ATS",
    blurb: "Neutral single-column ATS — high parse reliability.",
    category: "Classic",
    accent: "#334155",
    variant: { title: "Slate ATS", accent: "#334155", layout: "single" },
  },
  {
    id: "ivory_classic",
    name: "Ivory classic",
    blurb: "Warm off-white page tone with quiet rules.",
    category: "Classic",
    accent: "#78716c",
    variant: {
      title: "Ivory classic",
      accent: "#78716c",
      layout: "single",
      pageBg: "#fafaf9",
    },
  },
  {
    id: "graphite_lines",
    name: "Graphite rules",
    blurb: "Strict ALL-CAPS ruled sections for corporate ATS.",
    category: "Classic",
    accent: "#0f172a",
    variant: { title: "Graphite rules", accent: "#0f172a", layout: "ats-lines" },
  },
  {
    id: "ocean_centered",
    name: "Ocean formal",
    blurb: "Centered name block — research / policy applications.",
    category: "Classic",
    accent: "#0369a1",
    variant: { title: "Ocean formal", accent: "#0369a1", layout: "centered" },
  },
  {
    id: "navy_band",
    name: "Navy band",
    blurb: "Deep navy masthead for product and consulting roles.",
    category: "Modern",
    accent: "#1e3a8a",
    variant: { title: "Navy band", accent: "#1e3a8a", layout: "masthead" },
  },
  {
    id: "sky_strip",
    name: "Sky contact bar",
    blurb: "Thin sky-blue contact strip, clean body column.",
    category: "Modern",
    accent: "#0284c7",
    variant: { title: "Sky contact bar", accent: "#0284c7", layout: "header-strip" },
  },
  {
    id: "rose_masthead",
    name: "Rose masthead",
    blurb: "Soft rose header band — design-adjacent PMs.",
    category: "Modern",
    accent: "#be123c",
    variant: { title: "Rose masthead", accent: "#be123c", layout: "banner" },
  },
  {
    id: "forest_timeline",
    name: "Forest spine",
    blurb: "Date-led timeline in forest green for career arcs.",
    category: "Modern",
    accent: "#166534",
    variant: { title: "Forest spine", accent: "#166534", layout: "timeline" },
  },
  {
    id: "ink_rail",
    name: "Ink left rail",
    blurb: "Dark ink sidebar for contact and skills.",
    category: "Sidebar",
    accent: "#1e293b",
    variant: {
      title: "Ink left rail",
      accent: "#1e293b",
      layout: "left-rail",
      railBg: "#0f172a",
      railColor: "#f8fafc",
    },
  },
  {
    id: "mint_rail",
    name: "Mint right rail",
    blurb: "Mint right column for skills/education balance.",
    category: "Sidebar",
    accent: "#0f766e",
    variant: {
      title: "Mint right rail",
      accent: "#0f766e",
      layout: "right-rail",
      railBg: "#ecfdf5",
      railColor: "#064e3b",
    },
  },
  {
    id: "sand_dense",
    name: "Sand dense",
    blurb: "Compact sand-toned layout for long careers.",
    category: "Compact",
    accent: "#a16207",
    variant: {
      title: "Sand dense",
      accent: "#a16207",
      layout: "dense",
      pageBg: "#fffbeb",
    },
  },
  {
    id: "code_dense",
    name: "Code dense",
    blurb: "Courier dense packing for engineering CVs.",
    category: "Compact",
    accent: "#14532d",
    variant: {
      title: "Code dense",
      accent: "#14532d",
      layout: "mono",
      font: "Courier",
      fontBold: "Courier-Bold",
    },
  },
  {
    id: "folio_split",
    name: "Folio split",
    blurb: "Two-column folio — skills rail + narrative.",
    category: "Creative",
    accent: "#6d28d9",
    variant: { title: "Folio split", accent: "#6d28d9", layout: "split" },
  },
  {
    id: "amber_cards",
    name: "Amber cards",
    blurb: "Role cards with amber accents — storytelling resumes.",
    category: "Creative",
    accent: "#d97706",
    variant: { title: "Amber cards", accent: "#d97706", layout: "cards" },
  },
  {
    id: "indigo_blocks",
    name: "Indigo blocks",
    blurb: "Full-width tinted section bands.",
    category: "Creative",
    accent: "#4338ca",
    variant: { title: "Indigo blocks", accent: "#4338ca", layout: "blocks" },
  },
  {
    id: "teal_projects",
    name: "Teal project grid",
    blurb: "Experience + 2-up projects — maker / IC focus.",
    category: "Creative",
    accent: "#0f766e",
    variant: {
      title: "Teal project grid",
      accent: "#0f766e",
      layout: "grid-projects",
    },
  },
  {
    id: "copper_serif",
    name: "Copper serif",
    blurb: "Serif leadership layout with copper rules.",
    category: "Executive",
    accent: "#9a3412",
    variant: {
      title: "Copper serif",
      accent: "#9a3412",
      layout: "serif",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },
  {
    id: "stone_board",
    name: "Stone boardroom",
    blurb: "Formal stone palette for board / finance.",
    category: "Executive",
    accent: "#44403c",
    variant: {
      title: "Stone boardroom",
      accent: "#44403c",
      layout: "serif",
      font: "Times-Roman",
      fontBold: "Times-Bold",
      pageBg: "#fafaf9",
    },
  },
  {
    id: "quote_lead",
    name: "Quote narrative",
    blurb: "Large summary lead then structured body.",
    category: "Executive",
    accent: "#7c2d12",
    variant: {
      title: "Quote narrative",
      accent: "#7c2d12",
      layout: "pull-quote",
      font: "Times-Roman",
      fontBold: "Times-Bold",
    },
  },
  {
    id: "cyan_stack",
    name: "Cyan stack",
    blurb: "Engineering stack tags with cyan accents.",
    category: "Tech",
    accent: "#0891b2",
    variant: {
      title: "Cyan stack",
      accent: "#0891b2",
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

export function isTemplateId(v: string): v is TemplateId {
  return TEMPLATE_META.some((t) => t.id === v);
}

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
    certificates: data?.certificates || [],
  };
}

export function certificateLine(
  c: NonNullable<JsonResume["certificates"]>[number],
): string {
  return [c.name, c.issuer, c.date].filter(Boolean).join(" · ");
}

// Re-export for consumers that only import shared
export type { VariantLayout, VariantOpts };
