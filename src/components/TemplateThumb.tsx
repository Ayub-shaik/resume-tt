"use client";

import type { TemplateId } from "@/lib/ats/templates";
import { TEMPLATE_META } from "@/lib/ats/templates";

const SAMPLE = {
  name: "Alex Rivera",
  label: "Platform Engineer",
  contact: "alex@mail.com · LinkedIn · GitHub",
  summary:
    "Builds reliable CI/CD and cloud platforms. Owns Terraform modules and Azure Pipelines used across teams.",
  role: "Platform Engineer — Example Corp",
  dates: "2022 – Present",
  bullets: [
    "Cut release lead time 35% with multi-stage pipelines",
    "Standardized Terraform workspaces per environment",
  ],
  skills: "Azure DevOps · Terraform · Kubernetes · Python",
  edu: "B.Tech Computer Science",
  project: "Pipeline Kit — shared YAML templates",
};

function layoutKind(id: TemplateId): string {
  const meta = TEMPLATE_META.find((t) => t.id === id);
  if (meta?.variant) return meta.variant.layout;
  if (id === "sidebar") return "left-rail";
  if (id === "dual") return "split";
  if (id === "timeline") return "timeline";
  if (id === "executive" || id === "professional") return "serif";
  if (id === "tech" || id === "mono") return "mono";
  if (id === "modern") return "masthead";
  if (id === "compact") return "dense";
  if (id === "clean") return "single";
  return "single";
}

/** Miniature or full-page A4-ish preview that mirrors each PDF layout family. */
export function TemplateThumb({
  id,
  accent,
  fullPage,
  preview,
}: {
  id: TemplateId;
  accent: string;
  fullPage?: boolean;
  /** When set, thumbnails show the user's structured resume instead of sample filler. */
  preview?: {
    name?: string;
    label?: string;
    contact?: string;
    summary?: string;
    role?: string;
    dates?: string;
    bullets?: string[];
    skills?: string;
    edu?: string;
  } | null;
}) {
  const kind = layoutKind(id);
  const wrapClass = fullPage
    ? "template-thumb template-thumb--fullpage"
    : "template-thumb";
  const data = {
    name: preview?.name?.trim() || SAMPLE.name,
    label: preview?.label?.trim() || SAMPLE.label,
    contact: preview?.contact?.trim() || SAMPLE.contact,
    summary: preview?.summary?.trim() || SAMPLE.summary,
    role: preview?.role?.trim() || SAMPLE.role,
    dates: preview?.dates?.trim() || SAMPLE.dates,
    bullets:
      preview?.bullets?.filter(Boolean).length
        ? preview!.bullets!.filter(Boolean).slice(0, 3)
        : SAMPLE.bullets,
    skills: preview?.skills?.trim() || SAMPLE.skills,
    edu: preview?.edu?.trim() || SAMPLE.edu,
    project: SAMPLE.project,
  };

  const body = (
    <>
      <p className="thumb-name">{data.name}</p>
      <p className="thumb-label">{data.label}</p>
      <p className="thumb-contact">{data.contact}</p>
      <p className="thumb-h">Summary</p>
      <p className="thumb-p">{data.summary}</p>
      <p className="thumb-h">Experience</p>
      <div className="thumb-row">
        <span className="thumb-strong">{data.role}</span>
        <span className="thumb-meta">{data.dates}</span>
      </div>
      <ul className="thumb-ul">
        {data.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="thumb-h">Skills</p>
      <p className="thumb-p">{data.skills}</p>
      <p className="thumb-h">Education</p>
      <p className="thumb-p">{data.edu}</p>
    </>
  );

  if (kind === "left-rail" || kind === "right-rail" || kind === "split") {
    const railFirst = kind !== "right-rail";
    const rail = (
      <aside className="template-thumb__rail">
        <p className="thumb-name thumb-name--sm">{data.name}</p>
        <p className="thumb-label">{data.label}</p>
        <p className="thumb-h">Contact</p>
        <p className="thumb-p">{data.contact}</p>
        <p className="thumb-h">Skills</p>
        <p className="thumb-p">{data.skills}</p>
        <p className="thumb-h">Education</p>
        <p className="thumb-p">{data.edu}</p>
      </aside>
    );
    const main = (
      <main className="template-thumb__main">
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{data.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
        <p className="thumb-meta">{data.dates}</p>
        <ul className="thumb-ul">
          {data.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </main>
    );
    return (
      <div
        className={`${wrapClass} template-thumb--split`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {railFirst ? (
          <>
            {rail}
            {main}
          </>
        ) : (
          <>
            {main}
            {rail}
          </>
        )}
      </div>
    );
  }

  if (kind === "timeline") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent }}>
        <p className="thumb-name">{data.name}</p>
        <p className="thumb-label">{data.label}</p>
        <p className="thumb-contact">{data.contact}</p>
        <p className="thumb-h">Experience</p>
        <div className="thumb-timeline">
          <span className="thumb-meta">{data.dates}</span>
          <div>
            <p className="thumb-strong">{data.role}</p>
            <ul className="thumb-ul">
              {data.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="thumb-h">Skills</p>
        <p className="thumb-p">{data.skills}</p>
      </div>
    );
  }

  if (kind === "serif" || id === "executive" || id === "professional") {
    return (
      <div
        className={`${wrapClass} template-thumb--serif`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        <div className="thumb-exec-head">
          <p className="thumb-name thumb-name--lg">{data.name}</p>
          <p className="thumb-label">{data.label}</p>
        </div>
        <p className="thumb-contact">{data.contact}</p>
        <p className="thumb-h">Professional summary</p>
        <p className="thumb-p">{data.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
        <ul className="thumb-ul">
          {data.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "mono") {
    return (
      <div
        className={`${wrapClass} template-thumb--tech`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {body}
      </div>
    );
  }

  if (kind === "masthead" || kind === "banner" || kind === "top-bar") {
    return (
      <div
        className={`${wrapClass} template-thumb--modern`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        <div
          style={{
            background: accent,
            color: "#fff",
            margin: fullPage ? "-16px -16px 12px" : "-6px -6px 6px",
            padding: fullPage ? "16px" : "8px 6px",
          }}
        >
          <p className="thumb-name thumb-name--lg" style={{ color: "#fff" }}>
            {data.name}
          </p>
          <p className="thumb-label" style={{ color: "rgba(255,255,255,0.9)" }}>
            {data.label}
          </p>
        </div>
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{data.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
        <ul className="thumb-ul">
          {data.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "header-strip") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            background: "#f1f5f9",
            borderBottom: `2px solid ${accent}`,
            margin: fullPage ? "-16px -16px 12px" : "-6px -6px 6px",
            padding: fullPage ? "12px 16px" : "6px",
          }}
        >
          <div>
            <p className="thumb-name">{data.name}</p>
            <p className="thumb-label">{data.label}</p>
          </div>
          <p className="thumb-contact" style={{ textAlign: "right", maxWidth: "45%" }}>
            {data.contact}
          </p>
        </div>
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{data.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
      </div>
    );
  }

  if (kind === "ats-lines") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent, textAlign: "center" }}>
        <p className="thumb-name" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {data.name}
        </p>
        <p className="thumb-label">{data.label}</p>
        <p className="thumb-contact">{data.contact}</p>
        <div style={{ height: 2, background: "#111", margin: "8px 0" }} />
        <p className="thumb-h" style={{ textAlign: "left", borderBottom: "1px solid #111" }}>
          Experience
        </p>
        <p className="thumb-strong" style={{ textAlign: "left" }}>
          {data.role}
        </p>
        <ul className="thumb-ul" style={{ textAlign: "left" }}>
          {data.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "cards") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent }}>
        <p className="thumb-name">{data.name}</p>
        <p className="thumb-label">{data.label}</p>
        <div
          style={{
            border: `1px solid ${accent}`,
            borderRadius: 4,
            padding: 8,
            margin: "8px 0",
            background: "#fff7ed",
          }}
        >
          <p className="thumb-h">Summary</p>
          <p className="thumb-p">{data.summary}</p>
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 4, padding: 8 }}>
          <p className="thumb-strong">{data.role}</p>
          <ul className="thumb-ul">
            {data.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (kind === "blocks") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent }}>
        <div
          style={{
            background: accent,
            color: "#fff",
            margin: fullPage ? "-16px -16px 12px" : "-6px -6px 6px",
            padding: fullPage ? 16 : 8,
          }}
        >
          <p className="thumb-name" style={{ color: "#fff" }}>
            {data.name}
          </p>
          <p className="thumb-label" style={{ color: "rgba(255,255,255,0.9)" }}>
            {data.label}
          </p>
        </div>
        <div
          style={{
            borderLeft: `4px solid ${accent}`,
            background: "#f8fafc",
            padding: 8,
            marginBottom: 6,
          }}
        >
          <p className="thumb-h">Experience</p>
          <p className="thumb-strong">{data.role}</p>
        </div>
        <div
          style={{
            borderLeft: `4px solid ${accent}`,
            background: "#f8fafc",
            padding: 8,
          }}
        >
          <p className="thumb-h">Skills</p>
          <p className="thumb-p">{data.skills}</p>
        </div>
      </div>
    );
  }

  if (kind === "grid-projects") {
    return (
      <div className={wrapClass} style={{ ["--thumb-accent" as string]: accent }}>
        <p className="thumb-name">{data.name}</p>
        <p className="thumb-label">{data.label}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
        <p className="thumb-h">Projects</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={{ border: `1px solid ${accent}`, borderRadius: 3, padding: 6 }}>
            <p className="thumb-strong">{data.project}</p>
          </div>
          <div style={{ border: `1px solid ${accent}`, borderRadius: 3, padding: 6 }}>
            <p className="thumb-strong">Observability Pack</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "pull-quote") {
    return (
      <div
        className={`${wrapClass} template-thumb--serif`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        <p className="thumb-name thumb-name--lg">{data.name}</p>
        <p className="thumb-label">{data.label}</p>
        <p
          className="thumb-p"
          style={{
            borderLeft: `3px solid ${accent}`,
            paddingLeft: 8,
            fontStyle: "italic",
            margin: "8px 0",
          }}
        >
          {data.summary}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 8 }}>
          <div>
            <p className="thumb-h">Experience</p>
            <p className="thumb-strong">{data.role}</p>
          </div>
          <div>
            <p className="thumb-h">Skills</p>
            <p className="thumb-p">{data.skills}</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "dense") {
    return (
      <div
        className={`${wrapClass} template-thumb--compact`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {body}
      </div>
    );
  }

  if (kind === "centered") {
    return (
      <div
        className={wrapClass}
        style={{ ["--thumb-accent" as string]: accent, textAlign: "center" }}
      >
        <p className="thumb-name thumb-name--lg">{data.name}</p>
        <p className="thumb-label" style={{ color: accent }}>
          {data.label}
        </p>
        <p className="thumb-contact">{data.contact}</p>
        <div style={{ height: 2, width: 40, background: accent, margin: "6px auto" }} />
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{data.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{data.role}</p>
      </div>
    );
  }

  return (
    <div
      className={`${wrapClass} ${id === "clean" ? "template-thumb--clean" : ""}`}
      style={{ ["--thumb-accent" as string]: accent }}
    >
      {body}
    </div>
  );
}
