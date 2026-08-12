import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { JsonResume } from "@/lib/ats/jsonresume";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function resumeToHtml(resume: JsonResume, title = "Resume"): string {
  const b = resume.basics || {};
  const contact = [b.email, b.phone, b.url].filter(Boolean).join(" · ");
  const sections: string[] = [];
  if (b.summary) sections.push(`<section><h2>Summary</h2><p>${esc(b.summary)}</p></section>`);
  if (resume.work?.length) {
    sections.push(
      `<section><h2>Experience</h2>${resume.work
        .map(
          (w) =>
            `<article><h3>${esc(w.position)}${w.name ? ` · ${esc(w.name)}` : ""}</h3><p class="meta">${esc([w.location, w.startDate, w.endDate || "Present"].filter(Boolean).join(" | "))}</p><ul>${(w.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul></article>`,
        )
        .join("")}</section>`,
    );
  }
  if (resume.skills?.length) {
    sections.push(
      `<section><h2>Skills</h2><p>${resume.skills.map((s) => [s.name, ...(s.keywords || [])].filter(Boolean).map(esc).join(": ")).join(" · ")}</p></section>`,
    );
  }
  if (resume.projects?.length) {
    sections.push(
      `<section><h2>Projects</h2>${resume.projects.map((p) => `<article><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><ul>${(p.highlights || []).map((h) => `<li>${esc(h)}</li>`).join("")}</ul></article>`).join("")}</section>`,
    );
  }
  if (resume.education?.length) {
    sections.push(
      `<section><h2>Education</h2>${resume.education.map((e) => `<article><h3>${esc([e.studyType, e.area].filter(Boolean).join(" in "))}</h3><p class="meta">${esc([e.institution, e.startDate, e.endDate].filter(Boolean).join(" | "))}</p></article>`).join("")}</section>`,
    );
  }
  if (resume.certificates?.length) {
    sections.push(
      `<section><h2>Certifications</h2><ul>${resume.certificates.map((c) => `<li>${esc([c.name, c.issuer, c.date].filter(Boolean).join(" · "))}</li>`).join("")}</ul></section>`,
    );
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px/1.55 Arial,sans-serif;max-width:820px;margin:40px auto;color:#17221e}h1{font-size:34px;margin:0}h2{font-size:15px;text-transform:uppercase;letter-spacing:.1em;border-bottom:2px solid #0f766e;padding-bottom:4px;margin-top:25px}h3{margin:10px 0 2px}.meta{color:#5c6b63;font-size:12px}li{margin:3px 0}</style></head><body><h1>${esc(b.name || "Resume")}</h1><p>${esc(b.label || "")}</p><p class="meta">${esc(contact)}</p>${sections.join("")}</body></html>`;
}

export function resumeToPortableSections(resume: JsonResume) {
  return {
    schema: "tomorrowtools.resume.sections.v1",
    validatedAt: new Date().toISOString(),
    sections: [
      { id: "identity", label: "Identity", data: resume.basics || {} },
      { id: "summary", label: "Summary", data: { text: resume.basics?.summary || "" } },
      { id: "experience", label: "Experience", data: resume.work || [] },
      { id: "skills", label: "Skills", data: resume.skills || [] },
      { id: "projects", label: "Projects", data: resume.projects || [] },
      { id: "education", label: "Education", data: resume.education || [] },
      { id: "certifications", label: "Certifications", data: resume.certificates || [] },
    ],
    resume,
  };
}

export async function resumeToDocx(resume: JsonResume): Promise<Buffer> {
  const b = resume.basics || {};
  const children: Paragraph[] = [
    new Paragraph({
      text: b.name || "Resume",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: b.label || "", alignment: AlignmentType.CENTER }),
    new Paragraph({
      text: [b.email, b.phone, b.url].filter(Boolean).join(" · "),
      alignment: AlignmentType.CENTER,
    }),
  ];
  if (b.summary) children.push(new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }), new Paragraph(b.summary));
  for (const w of resume.work || []) {
    children.push(
      new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: [w.position, w.name].filter(Boolean).join(" · "), bold: true })] }),
      new Paragraph([w.location, w.startDate, w.endDate || "Present"].filter(Boolean).join(" | ")),
      ...(w.highlights || []).map((h) => new Paragraph({ text: h, bullet: { level: 0 } })),
    );
  }
  if (resume.skills?.length) {
    children.push(new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_1 }), new Paragraph(resume.skills.map((s) => [s.name, ...(s.keywords || [])].filter(Boolean).join(": ")).join(" · ")));
  }
  if (resume.education?.length) {
    children.push(new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_1 }), ...resume.education.map((e) => new Paragraph([e.studyType, e.area, e.institution].filter(Boolean).join(" · "))));
  }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })));
}
