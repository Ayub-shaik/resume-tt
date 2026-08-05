"use client";

import type { TemplateId } from "@/lib/ats/templates";

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

/** Miniature A4-ish preview that mirrors each PDF layout family. */
export function TemplateThumb({
  id,
  accent,
}: {
  id: TemplateId;
  accent: string;
}) {
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

  if (id === "sidebar" || id === "dual") {
    return (
      <div className="template-thumb template-thumb--split" style={{ ["--thumb-accent" as string]: accent }}>
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
      </div>
    );
  }

  if (id === "timeline") {
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

  if (id === "executive" || id === "professional") {
    return (
      <div
        className={`template-thumb ${id === "professional" ? "template-thumb--serif" : ""}`}
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

  if (id === "tech" || id === "mono") {
    return (
      <div
        className={`template-thumb ${id === "mono" ? "template-thumb--mono" : "template-thumb--tech"}`}
        style={{ ["--thumb-accent" as string]: accent }}
      >
        {body}
      </div>
    );
  }

  if (id === "modern") {
    return (
      <div className="template-thumb template-thumb--modern" style={{ ["--thumb-accent" as string]: accent }}>
        <p className="thumb-name thumb-name--lg">{SAMPLE.name}</p>
        <p className="thumb-label" style={{ color: accent }}>
          {SAMPLE.label}
        </p>
        <p className="thumb-contact">{SAMPLE.contact}</p>
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

  if (id === "compact") {
    return (
      <div className="template-thumb template-thumb--compact" style={{ ["--thumb-accent" as string]: accent }}>
        {body}
      </div>
    );
  }

  // classic / clean default
  return (
    <div
      className={`template-thumb ${id === "clean" ? "template-thumb--clean" : ""}`}
      style={{ ["--thumb-accent" as string]: accent }}
    >
      {body}
    </div>
  );
}
