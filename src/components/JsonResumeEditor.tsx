"use client";

import type { ReactNode } from "react";
import type { JsonResume } from "@/lib/ats/jsonresume";

type Work = NonNullable<JsonResume["work"]>[number];
type Education = NonNullable<JsonResume["education"]>[number];
type Skill = NonNullable<JsonResume["skills"]>[number];
type Project = NonNullable<JsonResume["projects"]>[number];
type Certificate = NonNullable<JsonResume["certificates"]>[number];

function emptyResume(): JsonResume {
  return {
    basics: {
      name: "",
      label: "",
      email: "",
      phone: "",
      url: "",
      summary: "",
      location: { city: "", region: "", countryCode: "" },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
  };
}

function inputClass() {
  return "w-full rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]";
}

function labelClass() {
  return "mb-1 block text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase";
}

function Section({
  title,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-white/80">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold">
          {title}
        </h3>
        {onAdd ? (
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-0.5 text-[11px] font-semibold"
            onClick={onAdd}
          >
            {addLabel || "+ Add"}
          </button>
        ) : null}
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

export function JsonResumeEditor({
  value,
  onChange,
}: {
  value: JsonResume | null;
  onChange: (next: JsonResume) => void;
}) {
  const data = value || emptyResume();
  const basics = data.basics || {};

  function patch(partial: Partial<JsonResume>) {
    onChange({ ...data, ...partial });
  }

  function patchBasics(partial: NonNullable<JsonResume["basics"]>) {
    patch({ basics: { ...basics, ...partial } });
  }

  function patchList<T>(
    key: keyof JsonResume,
    list: T[],
    idx: number,
    item: T,
  ) {
    const next = [...list];
    next[idx] = item;
    patch({ [key]: next } as Partial<JsonResume>);
  }

  function addListItem<T>(key: keyof JsonResume, list: T[], item: T) {
    patch({ [key]: [...list, item] } as Partial<JsonResume>);
  }

  function removeListItem<T>(key: keyof JsonResume, list: T[], idx: number) {
    patch({ [key]: list.filter((_, i) => i !== idx) } as Partial<JsonResume>);
  }

  const work = data.work || [];
  const education = data.education || [];
  const skills = data.skills || [];
  const projects = data.projects || [];
  const certificates = data.certificates || [];

  return (
    <div className="space-y-3 overflow-y-auto pr-1">
      <Section title="Basics">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass()}>Full name</label>
            <input
              className={inputClass()}
              value={basics.name || ""}
              onChange={(e) => patchBasics({ name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Headline</label>
            <input
              className={inputClass()}
              value={basics.label || ""}
              onChange={(e) => patchBasics({ label: e.target.value })}
              placeholder="Senior Platform Engineer"
            />
          </div>
          <div>
            <label className={labelClass()}>Email</label>
            <input
              className={inputClass()}
              value={basics.email || ""}
              onChange={(e) => patchBasics({ email: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>Phone</label>
            <input
              className={inputClass()}
              value={basics.phone || ""}
              onChange={(e) => patchBasics({ phone: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass()}>City</label>
            <input
              className={inputClass()}
              value={basics.location?.city || ""}
              onChange={(e) =>
                patchBasics({
                  location: { ...basics.location, city: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className={labelClass()}>Region / country</label>
            <input
              className={inputClass()}
              value={
                [basics.location?.region, basics.location?.countryCode]
                  .filter(Boolean)
                  .join(", ") || ""
              }
              onChange={(e) => {
                const parts = e.target.value.split(",").map((p) => p.trim());
                patchBasics({
                  location: {
                    ...basics.location,
                    region: parts[0] || "",
                    countryCode: parts[1] || "",
                  },
                });
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Website / LinkedIn</label>
            <input
              className={inputClass()}
              value={basics.url || ""}
              onChange={(e) => patchBasics({ url: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass()}>Summary</label>
            <textarea
              className={`${inputClass()} min-h-[88px] resize-y`}
              value={basics.summary || ""}
              onChange={(e) => patchBasics({ summary: e.target.value })}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Experience"
        onAdd={() =>
          addListItem("work", work, {
            name: "",
            position: "",
            location: "",
            startDate: "",
            endDate: "",
            highlights: [""],
          })
        }
        addLabel="+ Role"
      >
        {!work.length ? (
          <p className="text-sm text-[var(--muted)]">No roles yet.</p>
        ) : null}
        {work.map((w, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-dashed border-[var(--line)] p-2.5"
          >
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--danger)]"
                onClick={() => removeListItem("work", work, i)}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass()}>Company</label>
                <input
                  className={inputClass()}
                  value={w.name || ""}
                  onChange={(e) =>
                    patchList("work", work, i, { ...w, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>Title</label>
                <input
                  className={inputClass()}
                  value={w.position || ""}
                  onChange={(e) =>
                    patchList("work", work, i, {
                      ...w,
                      position: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>Start</label>
                <input
                  className={inputClass()}
                  value={w.startDate || ""}
                  onChange={(e) =>
                    patchList("work", work, i, {
                      ...w,
                      startDate: e.target.value,
                    })
                  }
                  placeholder="2022-01"
                />
              </div>
              <div>
                <label className={labelClass()}>End</label>
                <input
                  className={inputClass()}
                  value={w.endDate || ""}
                  onChange={(e) =>
                    patchList("work", work, i, {
                      ...w,
                      endDate: e.target.value,
                    })
                  }
                  placeholder="Present"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass()}>Location</label>
                <input
                  className={inputClass()}
                  value={w.location || ""}
                  onChange={(e) =>
                    patchList("work", work, i, {
                      ...w,
                      location: e.target.value,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass()}>Bullets (one per line)</label>
                <textarea
                  className={`${inputClass()} min-h-[72px] resize-y font-mono text-xs`}
                  value={(w.highlights || []).join("\n")}
                  onChange={(e) =>
                    patchList("work", work, i, {
                      ...w,
                      highlights: e.target.value
                        .split("\n")
                        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Education"
        onAdd={() =>
          addListItem("education", education, {
            institution: "",
            area: "",
            studyType: "",
            startDate: "",
            endDate: "",
          })
        }
        addLabel="+ School"
      >
        {!education.length ? (
          <p className="text-sm text-[var(--muted)]">No education yet.</p>
        ) : null}
        {education.map((e, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-dashed border-[var(--line)] p-2.5"
          >
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--danger)]"
                onClick={() => removeListItem("education", education, i)}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass()}>Institution</label>
                <input
                  className={inputClass()}
                  value={e.institution || ""}
                  onChange={(ev) =>
                    patchList("education", education, i, {
                      ...e,
                      institution: ev.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>Degree</label>
                <input
                  className={inputClass()}
                  value={e.studyType || ""}
                  onChange={(ev) =>
                    patchList("education", education, i, {
                      ...e,
                      studyType: ev.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>Field</label>
                <input
                  className={inputClass()}
                  value={e.area || ""}
                  onChange={(ev) =>
                    patchList("education", education, i, {
                      ...e,
                      area: ev.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>Start</label>
                <input
                  className={inputClass()}
                  value={e.startDate || ""}
                  onChange={(ev) =>
                    patchList("education", education, i, {
                      ...e,
                      startDate: ev.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass()}>End</label>
                <input
                  className={inputClass()}
                  value={e.endDate || ""}
                  onChange={(ev) =>
                    patchList("education", education, i, {
                      ...e,
                      endDate: ev.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Skills"
        onAdd={() => addListItem("skills", skills, { name: "", keywords: [] })}
        addLabel="+ Skill group"
      >
        {!skills.length ? (
          <p className="text-sm text-[var(--muted)]">No skills yet.</p>
        ) : null}
        {skills.map((s, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-dashed border-[var(--line)] p-2.5"
          >
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--danger)]"
                onClick={() => removeListItem("skills", skills, i)}
              >
                Remove
              </button>
            </div>
            <div>
              <label className={labelClass()}>Group name</label>
              <input
                className={inputClass()}
                value={s.name || ""}
                onChange={(ev) =>
                  patchList("skills", skills, i, { ...s, name: ev.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass()}>Keywords (comma-separated)</label>
              <input
                className={inputClass()}
                value={(s.keywords || []).join(", ")}
                onChange={(ev) =>
                  patchList("skills", skills, i, {
                    ...s,
                    keywords: ev.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Projects"
        onAdd={() =>
          addListItem("projects", projects, {
            name: "",
            description: "",
            highlights: [],
          })
        }
        addLabel="+ Project"
      >
        {!projects.length ? (
          <p className="text-sm text-[var(--muted)]">No projects yet.</p>
        ) : null}
        {projects.map((p, i) => (
          <ProjectCard
            key={i}
            project={p}
            onChange={(next) => patchList("projects", projects, i, next)}
            onRemove={() => removeListItem("projects", projects, i)}
          />
        ))}
      </Section>

      <Section
        title="Certifications"
        onAdd={() =>
          addListItem("certificates", certificates, {
            name: "",
            issuer: "",
            date: "",
          })
        }
        addLabel="+ Certificate"
      >
        {!certificates.length ? (
          <p className="text-sm text-[var(--muted)]">No certifications yet.</p>
        ) : null}
        {certificates.map((c, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-lg border border-dashed border-[var(--line)] p-2.5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--danger)]"
                onClick={() => removeListItem("certificates", certificates, i)}
              >
                Remove
              </button>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass()}>Name</label>
              <input
                className={inputClass()}
                value={c.name || ""}
                onChange={(ev) =>
                  patchList("certificates", certificates, i, {
                    ...c,
                    name: ev.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass()}>Issuer</label>
              <input
                className={inputClass()}
                value={c.issuer || ""}
                onChange={(ev) =>
                  patchList("certificates", certificates, i, {
                    ...c,
                    issuer: ev.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className={labelClass()}>Date</label>
              <input
                className={inputClass()}
                value={c.date || ""}
                onChange={(ev) =>
                  patchList("certificates", certificates, i, {
                    ...c,
                    date: ev.target.value,
                  })
                }
              />
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function ProjectCard({
  project,
  onChange,
  onRemove,
}: {
  project: Project;
  onChange: (next: Project) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-[var(--line)] p-2.5">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-[11px] font-semibold text-[var(--danger)]"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <div>
        <label className={labelClass()}>Name</label>
        <input
          className={inputClass()}
          value={project.name || ""}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass()}>Description</label>
        <textarea
          className={`${inputClass()} min-h-[64px] resize-y`}
          value={project.description || ""}
          onChange={(e) => onChange({ ...project, description: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass()}>Highlights (one per line)</label>
        <textarea
          className={`${inputClass()} min-h-[56px] resize-y font-mono text-xs`}
          value={(project.highlights || []).join("\n")}
          onChange={(e) =>
            onChange({
              ...project,
              highlights: e.target.value
                .split("\n")
                .map((l) => l.replace(/^[-•*]\s*/, "").trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    </div>
  );
}
