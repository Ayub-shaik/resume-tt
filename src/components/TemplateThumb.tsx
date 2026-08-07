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

/** Miniature A4-ish preview that mirrors each PDF layout family. */
export function TemplateThumb({
  id,
  accent,
}: {
  id: TemplateId;
  accent: string;
}) {
  const kind = layoutKind(id);
  const body = (
    <>
      <p className="thumb-name">{SAMPLE.name}</p>
      <p className="thumb-label">{SAMPLE.label}</p>
      <p className="thumb-contact">{SAMPLE.contact}</p>
      <p className="thumb-h">Summary</p>
      <p className="thumb-p">{SAMPLE.summary}</p>
      <p className="thumb-h">Experience</p>
      <div className="thumb-row">
        <span className="thumb-strong">{SAMPLE.role}</span>
        <span className="thumb-meta">{SAMPLE.dates}</span>
      </div>
      <ul className="thumb-ul">
        {SAMPLE.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="thumb-h">Skills</p>
      <p className="thumb-p">{SAMPLE.skills}</p>
      <p className="thumb-h">Education</p>
      <p className="thumb-p">{SAMPLE.edu}</p>
    </>
  );

  if (kind === "left-rail" || kind === "right-rail" || kind === "split") {
    const railFirst = kind !== "right-rail";
    const rail = (
      <aside className="template-thumb__rail">
        <p className="thumb-name thumb-name--sm">{SAMPLE.name}</p>
        <p className="thumb-label">{SAMPLE.label}</p>
        <p className="thumb-h">Contact</p>
        <p className="thumb-p">{SAMPLE.contact}</p>
        <p className="thumb-h">Skills</p>
        <p className="thumb-p">{SAMPLE.skills}</p>
        <p className="thumb-h">Education</p>
        <p className="thumb-p">{SAMPLE.edu}</p>
      </aside>
    );
    const main = (
      <main className="template-thumb__main">
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{SAMPLE.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{SAMPLE.role}</p>
        <p className="thumb-meta">{SAMPLE.dates}</p>
        <ul className="thumb-ul">
          {SAMPLE.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </main>
    );
    return (
      <div
        className="template-thumb template-thumb--split"
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
      <div className="template-thumb" style={{ ["--thumb-accent" as string]: accent }}>
        <p className="thumb-name">{SAMPLE.name}</p>
        <p className="thumb-label">{SAMPLE.label}</p>
        <p className="thumb-contact">{SAMPLE.contact}</p>
        <p className="thumb-h">Experience</p>
        <div className="thumb-timeline">
          <span className="thumb-meta">{SAMPLE.dates}</span>
          <div>
            <p className="thumb-strong">{SAMPLE.role}</p>
            <ul className="thumb-ul">
              {SAMPLE.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="thumb-h">Skills</p>
        <p className="thumb-p">{SAMPLE.skills}</p>
      </div>
    );
  }

  if (kind === "serif" || id === "executive" || id === "professional") {
    return (
      <div
        className="template-thumb template-thumb--serif"
        style={{ ["--thumb-accent" as string]: accent }}
      >
        <div className="thumb-exec-head">
          <p className="thumb-name thumb-name--lg">{SAMPLE.name}</p>
          <p className="thumb-label">{SAMPLE.label}</p>
        </div>
        <p className="thumb-contact">{SAMPLE.contact}</p>
        <p className="thumb-h">Professional summary</p>
        <p className="thumb-p">{SAMPLE.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{SAMPLE.role}</p>
        <ul className="thumb-ul">
          {SAMPLE.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "mono") {
    return (
      <div
        className="template-thumb template-thumb--tech"
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {body}
      </div>
    );
  }

  if (kind === "masthead" || kind === "banner" || kind === "top-bar") {
    return (
      <div
        className="template-thumb template-thumb--modern"
        style={{ ["--thumb-accent" as string]: accent }}
      >
        <div
          style={{
            background: accent,
            color: "#fff",
            margin: "-6px -6px 6px",
            padding: "8px 6px",
          }}
        >
          <p className="thumb-name thumb-name--lg" style={{ color: "#fff" }}>
            {SAMPLE.name}
          </p>
          <p className="thumb-label" style={{ color: "rgba(255,255,255,0.9)" }}>
            {SAMPLE.label}
          </p>
        </div>
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{SAMPLE.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{SAMPLE.role}</p>
        <ul className="thumb-ul">
          {SAMPLE.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (kind === "dense") {
    return (
      <div
        className="template-thumb template-thumb--compact"
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {body}
      </div>
    );
  }

  if (kind === "centered") {
    return (
      <div className="template-thumb" style={{ ["--thumb-accent" as string]: accent, textAlign: "center" }}>
        <p className="thumb-name thumb-name--lg">{SAMPLE.name}</p>
        <p className="thumb-label" style={{ color: accent }}>
          {SAMPLE.label}
        </p>
        <p className="thumb-contact">{SAMPLE.contact}</p>
        <div style={{ height: 2, width: 40, background: accent, margin: "6px auto" }} />
        <p className="thumb-h">Summary</p>
        <p className="thumb-p">{SAMPLE.summary}</p>
        <p className="thumb-h">Experience</p>
        <p className="thumb-strong">{SAMPLE.role}</p>
      </div>
    );
  }

  return (
    <div
      className={`template-thumb ${id === "clean" ? "template-thumb--clean" : ""}`}
      style={{ ["--thumb-accent" as string]: accent }}
    >
      {body}
    </div>
  );
}
