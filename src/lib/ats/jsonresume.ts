import { z } from "zod";

/** JSON Resume subset — interchange for OpenClaw structure/tailor + in-app PDF templates */
export const JsonResumeSchema = z.object({
  $schema: z.string().optional(),
  basics: z
    .object({
      name: z.string().optional(),
      label: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      url: z.string().optional(),
      summary: z.string().optional(),
      location: z
        .object({
          city: z.string().optional(),
          region: z.string().optional(),
          countryCode: z.string().optional(),
        })
        .optional(),
      profiles: z
        .array(
          z.object({
            network: z.string().optional(),
            username: z.string().optional(),
            url: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  work: z
    .array(
      z.object({
        name: z.string().optional(),
        position: z.string().optional(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        summary: z.string().optional(),
        highlights: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        area: z.string().optional(),
        studyType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .optional(),
  skills: z
    .array(
      z.object({
        name: z.string().optional(),
        level: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  certificates: z
    .array(
      z.object({
        name: z.string().optional(),
        date: z.string().optional(),
        issuer: z.string().optional(),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        highlights: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  meta: z
    .object({
      canonical: z.string().optional(),
      version: z.string().optional(),
      lastModified: z.string().optional(),
    })
    .optional(),
});

export type JsonResume = z.infer<typeof JsonResumeSchema>;

export function jsonResumeToMarkdown(jr: JsonResume): string {
  const b = jr.basics || {};
  const lines: string[] = [];
  if (b.name) lines.push(`# ${b.name}`);
  if (b.label) lines.push(b.label);
  const contact = [b.email, b.phone, b.url].filter(Boolean).join(" · ");
  if (contact) lines.push(contact);
  if (b.location?.city || b.location?.region) {
    lines.push(
      [b.location.city, b.location.region, b.location.countryCode]
        .filter(Boolean)
        .join(", "),
    );
  }
  if (b.summary) {
    lines.push("", "## Professional Summary", "", b.summary);
  }
  if (jr.skills?.length) {
    lines.push("", "## Skills", "");
    for (const s of jr.skills) {
      const kw = (s.keywords || []).join(", ");
      lines.push(`- ${s.name || "Skills"}${kw ? `: ${kw}` : ""}`);
    }
  }
  if (jr.work?.length) {
    lines.push("", "## Professional Experience", "");
    for (const w of jr.work) {
      lines.push(`### ${w.position || "Role"}`);
      lines.push([w.name, w.location].filter(Boolean).join(" | "));
      lines.push([w.startDate, w.endDate || "Present"].filter(Boolean).join(" — "));
      for (const h of w.highlights || []) lines.push(`- ${h}`);
      lines.push("");
    }
  }
  if (jr.education?.length) {
    lines.push("## Education", "");
    for (const e of jr.education) {
      lines.push(
        `- ${[e.studyType, e.area].filter(Boolean).join(" in ")} — ${e.institution || ""} (${[e.startDate, e.endDate].filter(Boolean).join("–")})`,
      );
    }
  }
  if (jr.certificates?.length) {
    lines.push("", "## Certifications", "");
    for (const c of jr.certificates) {
      lines.push(`- ${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`);
    }
  }
  return `${lines.join("\n").trim()}\n`;
}
