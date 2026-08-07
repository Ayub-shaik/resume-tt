import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

/** Layout families — structurally distinct shells (not accent-only clones). */
export type VariantLayout =
  | "single"
  | "masthead"
  | "left-rail"
  | "right-rail"
  | "top-bar"
  | "timeline"
  | "split"
  | "dense"
  | "serif"
  | "mono"
  | "centered"
  | "banner"
  | "ats-lines"
  | "header-strip"
  | "cards"
  | "blocks"
  | "grid-projects"
  | "pull-quote";

export type VariantOpts = {
  title: string;
  accent: string;
  layout: VariantLayout;
  /** Optional page background (sidebar layouts ignore for main). */
  pageBg?: string;
  railBg?: string;
  railColor?: string;
  font?: "Helvetica" | "Times-Roman" | "Courier";
  fontBold?: "Helvetica-Bold" | "Times-Bold" | "Courier-Bold";
};

function fonts(opts: VariantOpts) {
  const font = opts.font || "Helvetica";
  const fontBold =
    opts.fontBold ||
    (font === "Times-Roman"
      ? "Times-Bold"
      : font === "Courier"
        ? "Courier-Bold"
        : "Helvetica-Bold");
  return { font, fontBold };
}

function WorkBlock({
  r,
  accent,
  font,
  fontBold,
  dense,
}: {
  r: NormalizedResume;
  accent: string;
  font: string;
  fontBold: string;
  dense?: boolean;
}) {
  return (
    <>
      {(r.work || []).map((w, i) => (
        <View key={i} style={{ marginBottom: dense ? 5 : 8 }} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
            <Text style={{ fontFamily: fontBold, fontSize: dense ? 9 : 10 }}>
              {[w.position, w.name].filter(Boolean).join(" — ")}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>{workRange(w)}</Text>
          </View>
          {w.location ? (
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 1 }}>{w.location}</Text>
          ) : null}
          {(w.highlights || []).map((h, j) => (
            <Text
              key={j}
              style={{
                marginLeft: 8,
                marginTop: 1,
                fontSize: dense ? 8 : 9,
                lineHeight: 1.3,
                fontFamily: font,
              }}
            >
              • {h}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function EduBlock({ r, fontBold, dense }: { r: NormalizedResume; fontBold: string; dense?: boolean }) {
  return (
    <>
      {(r.education || []).map((e, i) => (
        <View key={i} style={{ marginBottom: dense ? 4 : 6 }} wrap={false}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
            <Text style={{ fontFamily: fontBold, fontSize: dense ? 8.5 : 9.5 }}>
              {e.institution || [e.studyType, e.area].filter(Boolean).join(" in ")}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>{eduRange(e)}</Text>
          </View>
          <Text style={{ fontSize: 8, color: "#475569" }}>
            {[e.studyType, e.area].filter(Boolean).join(" · ")}
          </Text>
        </View>
      ))}
    </>
  );
}

function SkillsBlock({ r, dense }: { r: NormalizedResume; dense?: boolean }) {
  return (
    <>
      {(r.skills || []).map((sk, i) => (
        <Text key={i} style={{ marginBottom: 2, fontSize: dense ? 8 : 9, lineHeight: 1.25 }}>
          {skillLine(sk)}
        </Text>
      ))}
    </>
  );
}

function ProjectsBlock({
  r,
  fontBold,
  dense,
}: {
  r: NormalizedResume;
  fontBold: string;
  dense?: boolean;
}) {
  return (
    <>
      {(r.projects || []).map((p, i) => (
        <View key={i} style={{ marginBottom: dense ? 4 : 6 }} wrap={false}>
          <Text style={{ fontFamily: fontBold, fontSize: dense ? 8.5 : 9.5 }}>{p.name}</Text>
          {p.description ? (
            <Text style={{ fontSize: dense ? 8 : 9, lineHeight: 1.3 }}>{p.description}</Text>
          ) : null}
          {(p.highlights || []).map((h, j) => (
            <Text key={j} style={{ marginLeft: 8, fontSize: dense ? 8 : 9, marginTop: 1 }}>
              • {h}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function SectionHeading({
  label,
  accent,
  fontBold,
  style,
}: {
  label: string;
  accent: string;
  fontBold: string;
  style?: "rule" | "bar" | "plain" | "chip";
}) {
  if (style === "bar") {
    return (
      <Text
        style={{
          fontFamily: fontBold,
          fontSize: 9,
          textTransform: "uppercase",
          color: "#fff",
          backgroundColor: accent,
          paddingVertical: 3,
          paddingHorizontal: 6,
          marginBottom: 6,
          marginTop: 10,
        }}
      >
        {label}
      </Text>
    );
  }
  if (style === "chip") {
    return (
      <Text
        style={{
          fontFamily: fontBold,
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: accent,
          marginBottom: 5,
          marginTop: 10,
        }}
      >
        {label}
      </Text>
    );
  }
  if (style === "plain") {
    return (
      <Text
        style={{
          fontFamily: fontBold,
          fontSize: 10,
          color: accent,
          marginBottom: 5,
          marginTop: 10,
        }}
      >
        {label}
      </Text>
    );
  }
  return (
    <Text
      style={{
        fontFamily: fontBold,
        fontSize: 9,
        textTransform: "uppercase",
        color: accent,
        borderBottomWidth: 1.5,
        borderBottomColor: accent,
        paddingBottom: 2,
        marginBottom: 6,
        marginTop: 10,
      }}
    >
      {label}
    </Text>
  );
}

function MainSections({
  r,
  opts,
  headingStyle,
  dense,
}: {
  r: NormalizedResume;
  opts: VariantOpts;
  headingStyle?: "rule" | "bar" | "plain" | "chip";
  dense?: boolean;
}) {
  const { font, fontBold } = fonts(opts);
  const b = r.basics;
  const hs = headingStyle || "rule";
  return (
    <View>
      {b.summary ? (
        <View>
          <SectionHeading label="Summary" accent={opts.accent} fontBold={fontBold} style={hs} />
          <Text style={{ fontSize: dense ? 8.5 : 9.5, lineHeight: 1.35, fontFamily: font }}>
            {b.summary}
          </Text>
        </View>
      ) : null}
      {(r.work?.length || 0) > 0 ? (
        <View>
          <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} style={hs} />
          <WorkBlock r={r} accent={opts.accent} font={font} fontBold={fontBold} dense={dense} />
        </View>
      ) : null}
      {(r.education?.length || 0) > 0 ? (
        <View>
          <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} style={hs} />
          <EduBlock r={r} fontBold={fontBold} dense={dense} />
        </View>
      ) : null}
      {(r.skills?.length || 0) > 0 &&
      opts.layout !== "left-rail" &&
      opts.layout !== "right-rail" ? (
        <View>
          <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} style={hs} />
          <SkillsBlock r={r} dense={dense} />
        </View>
      ) : null}
      {(r.projects?.length || 0) > 0 ? (
        <View>
          <SectionHeading label="Projects" accent={opts.accent} fontBold={fontBold} style={hs} />
          <ProjectsBlock r={r} fontBold={fontBold} dense={dense} />
        </View>
      ) : null}
    </View>
  );
}

function Rail({
  r,
  opts,
  side,
}: {
  r: NormalizedResume;
  opts: VariantOpts;
  side: "left" | "right";
}) {
  const { fontBold } = fonts(opts);
  const b = r.basics;
  const bg = opts.railBg || opts.accent;
  const color = opts.railColor || "#ffffff";
  return (
    <View
      style={{
        width: "32%",
        backgroundColor: bg,
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 12,
        color,
      }}
    >
      <Text style={{ fontFamily: fontBold, fontSize: 13, color, marginBottom: 4 }}>
        {b.name || "Candidate"}
      </Text>
      {b.label ? (
        <Text style={{ fontSize: 8, color, opacity: 0.9, marginBottom: 10 }}>{b.label}</Text>
      ) : null}
      <Text
        style={{
          fontFamily: fontBold,
          fontSize: 8,
          textTransform: "uppercase",
          marginTop: 8,
          marginBottom: 4,
          color,
        }}
      >
        Contact
      </Text>
      {b.email ? <Text style={{ fontSize: 8, color, marginBottom: 2 }}>{b.email}</Text> : null}
      {b.phone ? <Text style={{ fontSize: 8, color, marginBottom: 2 }}>{b.phone}</Text> : null}
      {b.location?.city ? (
        <Text style={{ fontSize: 8, color, marginBottom: 2 }}>{b.location.city}</Text>
      ) : null}
      {b.url ? <Text style={{ fontSize: 8, color, marginBottom: 2 }}>{b.url}</Text> : null}
      {(r.skills?.length || 0) > 0 ? (
        <View>
          <Text
            style={{
              fontFamily: fontBold,
              fontSize: 8,
              textTransform: "uppercase",
              marginTop: 12,
              marginBottom: 4,
              color,
            }}
          >
            Skills
          </Text>
          {(r.skills || []).map((sk, i) => (
            <Text key={i} style={{ fontSize: 8, color, marginBottom: 2 }}>
              {skillLine(sk)}
            </Text>
          ))}
        </View>
      ) : null}
      {side === "left" && (r.education?.length || 0) > 0 ? (
        <View>
          <Text
            style={{
              fontFamily: fontBold,
              fontSize: 8,
              textTransform: "uppercase",
              marginTop: 12,
              marginBottom: 4,
              color,
            }}
          >
            Education
          </Text>
          {(r.education || []).slice(0, 3).map((e, i) => (
            <View key={i} style={{ marginBottom: 5 }}>
              <Text style={{ fontFamily: fontBold, fontSize: 8, color }}>{e.institution}</Text>
              <Text style={{ fontSize: 7.5, color }}>{eduRange(e)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function VariantDocument({
  data,
  opts,
}: {
  data: NormalizedResume;
  opts: VariantOpts;
}) {
  const r = data;
  const b = r.basics;
  const { font, fontBold } = fonts(opts);
  const layout = opts.layout;

  if (layout === "left-rail" || layout === "right-rail") {
    const left = layout === "left-rail";
    const rail = <Rail r={r} opts={opts} side={left ? "left" : "right"} />;
    const main = (
      <View style={{ width: "68%", paddingTop: 28, paddingBottom: 28, paddingHorizontal: 16 }}>
        <MainSections
          r={{
            ...r,
            // Education already in left rail — skip duplicate when left-rail
            education: left ? [] : r.education,
          }}
          opts={opts}
          headingStyle="chip"
        />
        {left && (r.education?.length || 0) > 3 ? (
          <View>
            <SectionHeading label="More education" accent={opts.accent} fontBold={fontBold} style="chip" />
            <EduBlock r={{ ...r, education: (r.education || []).slice(3) }} fontBold={fontBold} />
          </View>
        ) : null}
      </View>
    );
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page size="A4" style={{ padding: 0, fontSize: 9.5, fontFamily: font, color: "#111" }}>
          <View style={{ flexDirection: "row", minHeight: "100%" }}>
            {left ? (
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
          </View>
        </Page>
      </Document>
    );
  }

  if (layout === "timeline") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 36,
            paddingBottom: 36,
            paddingHorizontal: 40,
            fontSize: 10,
            fontFamily: font,
            color: "#111",
            backgroundColor: opts.pageBg || "#fff",
          }}
        >
          <Text style={{ fontFamily: fontBold, fontSize: 20, marginBottom: 2 }}>
            {b.name || "Candidate"}
          </Text>
          {b.label ? (
            <Text style={{ fontSize: 10, color: opts.accent, marginBottom: 4 }}>{b.label}</Text>
          ) : null}
          <Text style={{ fontSize: 9, color: "#475569", marginBottom: 12 }}>{contactLine(b)}</Text>
          {b.summary ? (
            <View>
              <SectionHeading label="Summary" accent={opts.accent} fontBold={fontBold} />
              <Text style={{ lineHeight: 1.35 }}>{b.summary}</Text>
            </View>
          ) : null}
          {(r.work?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} />
              {(r.work || []).map((w, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8 }} wrap={false}>
                  <View style={{ width: 72 }}>
                    <Text style={{ fontSize: 8, color: opts.accent, fontFamily: fontBold }}>
                      {workRange(w)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 2,
                      backgroundColor: opts.accent,
                      marginRight: 8,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fontBold, fontSize: 10 }}>
                      {[w.position, w.name].filter(Boolean).join(" — ")}
                    </Text>
                    {(w.highlights || []).map((h, j) => (
                      <Text key={j} style={{ marginLeft: 6, marginTop: 1, fontSize: 9 }}>
                        • {h}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {(r.education?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} />
              <EduBlock r={r} fontBold={fontBold} />
            </View>
          ) : null}
          {(r.skills?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} />
              <SkillsBlock r={r} />
            </View>
          ) : null}
          {(r.projects?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Projects" accent={opts.accent} fontBold={fontBold} />
              <ProjectsBlock r={r} fontBold={fontBold} />
            </View>
          ) : null}
        </Page>
      </Document>
    );
  }

  if (layout === "split") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 32,
            paddingBottom: 32,
            paddingHorizontal: 32,
            fontSize: 9.5,
            fontFamily: font,
            color: "#111",
          }}
        >
          <Text style={{ fontFamily: fontBold, fontSize: 18 }}>{b.name || "Candidate"}</Text>
          {b.label ? <Text style={{ fontSize: 10, color: opts.accent }}>{b.label}</Text> : null}
          <Text style={{ fontSize: 9, marginBottom: 10, color: "#334155" }}>{contactLine(b)}</Text>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ width: "62%" }}>
              {b.summary ? (
                <View>
                  <SectionHeading label="Summary" accent={opts.accent} fontBold={fontBold} style="bar" />
                  <Text style={{ lineHeight: 1.3 }}>{b.summary}</Text>
                </View>
              ) : null}
              {(r.work?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} style="bar" />
                  <WorkBlock r={r} accent={opts.accent} font={font} fontBold={fontBold} />
                </View>
              ) : null}
            </View>
            <View style={{ width: "38%" }}>
              {(r.skills?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} style="bar" />
                  <SkillsBlock r={r} />
                </View>
              ) : null}
              {(r.education?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} style="bar" />
                  <EduBlock r={r} fontBold={fontBold} />
                </View>
              ) : null}
              {(r.projects?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Projects" accent={opts.accent} fontBold={fontBold} style="bar" />
                  <ProjectsBlock r={r} fontBold={fontBold} dense />
                </View>
              ) : null}
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  if (layout === "masthead" || layout === "banner" || layout === "top-bar") {
    const bandH = layout === "banner" ? 88 : layout === "top-bar" ? 10 : 72;
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page size="A4" style={{ padding: 0, fontSize: 10, fontFamily: font, color: "#111" }}>
          <View
            style={{
              backgroundColor: opts.accent,
              paddingTop: layout === "top-bar" ? 0 : 22,
              paddingBottom: layout === "top-bar" ? 0 : 18,
              paddingHorizontal: 36,
              minHeight: bandH,
              justifyContent: "center",
            }}
          >
            {layout !== "top-bar" ? (
              <>
                <Text style={{ fontFamily: fontBold, fontSize: 22, color: "#fff" }}>
                  {b.name || "Candidate"}
                </Text>
                {b.label ? (
                  <Text style={{ fontSize: 11, color: "#fff", opacity: 0.9, marginTop: 2 }}>
                    {b.label}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 9, color: "#fff", opacity: 0.85, marginTop: 4 }}>
                  {contactLine(b)}
                </Text>
              </>
            ) : null}
          </View>
          <View style={{ paddingTop: 20, paddingBottom: 32, paddingHorizontal: 36 }}>
            {layout === "top-bar" ? (
              <>
                <Text style={{ fontFamily: fontBold, fontSize: 20, marginBottom: 2 }}>
                  {b.name || "Candidate"}
                </Text>
                {b.label ? (
                  <Text style={{ fontSize: 10, color: opts.accent, marginBottom: 2 }}>{b.label}</Text>
                ) : null}
                <Text style={{ fontSize: 9, color: "#475569", marginBottom: 8 }}>{contactLine(b)}</Text>
              </>
            ) : null}
            <MainSections r={r} opts={opts} headingStyle={layout === "banner" ? "plain" : "rule"} />
          </View>
        </Page>
      </Document>
    );
  }

  if (layout === "centered") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 40,
            paddingBottom: 36,
            paddingHorizontal: 48,
            fontSize: 10,
            fontFamily: font,
            color: "#111",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontFamily: fontBold, fontSize: 22, textAlign: "center" }}>
              {b.name || "Candidate"}
            </Text>
            {b.label ? (
              <Text style={{ fontSize: 11, color: opts.accent, marginTop: 3 }}>{b.label}</Text>
            ) : null}
            <Text style={{ fontSize: 9, color: "#64748b", marginTop: 4, textAlign: "center" }}>
              {contactLine(b)}
            </Text>
            <View
              style={{
                marginTop: 10,
                width: 64,
                height: 2,
                backgroundColor: opts.accent,
              }}
            />
          </View>
          <MainSections r={r} opts={opts} headingStyle="plain" />
        </Page>
      </Document>
    );
  }

  if (layout === "ats-lines") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 32,
            paddingBottom: 32,
            paddingHorizontal: 40,
            fontSize: 9.5,
            fontFamily: font,
            color: "#111",
          }}
        >
          <Text
            style={{
              fontFamily: fontBold,
              fontSize: 16,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              textAlign: "center",
            }}
          >
            {b.name || "Candidate"}
          </Text>
          {b.label ? (
            <Text style={{ fontSize: 9, textAlign: "center", marginTop: 2, color: "#334155" }}>
              {b.label}
            </Text>
          ) : null}
          <Text style={{ fontSize: 8, textAlign: "center", color: "#475569", marginTop: 4, marginBottom: 8 }}>
            {contactLine(b)}
          </Text>
          <View style={{ borderBottomWidth: 2, borderBottomColor: "#111", marginBottom: 8 }} />
          {b.summary ? (
            <View style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: fontBold,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: "#111",
                  paddingBottom: 2,
                  marginBottom: 4,
                }}
              >
                Professional summary
              </Text>
              <Text style={{ lineHeight: 1.35 }}>{b.summary}</Text>
            </View>
          ) : null}
          {(r.work?.length || 0) > 0 ? (
            <View>
              <Text
                style={{
                  fontFamily: fontBold,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: "#111",
                  paddingBottom: 2,
                  marginBottom: 6,
                  marginTop: 4,
                }}
              >
                Experience
              </Text>
              {(r.work || []).map((w, i) => (
                <View
                  key={i}
                  style={{
                    marginBottom: 8,
                    borderBottomWidth: 0.5,
                    borderBottomColor: "#cbd5e1",
                    paddingBottom: 6,
                  }}
                  wrap={false}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fontBold, fontSize: 10 }}>
                      {[w.position, w.name].filter(Boolean).join(" | ")}
                    </Text>
                    <Text style={{ fontSize: 8 }}>{workRange(w)}</Text>
                  </View>
                  {w.location ? (
                    <Text style={{ fontSize: 8, color: "#64748b" }}>{w.location}</Text>
                  ) : null}
                  {(w.highlights || []).map((h, j) => (
                    <Text key={j} style={{ marginLeft: 8, marginTop: 1, fontSize: 9 }}>
                      • {h}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          {(r.education?.length || 0) > 0 ? (
            <View>
              <Text
                style={{
                  fontFamily: fontBold,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: "#111",
                  paddingBottom: 2,
                  marginBottom: 6,
                  marginTop: 4,
                }}
              >
                Education
              </Text>
              <EduBlock r={r} fontBold={fontBold} />
            </View>
          ) : null}
          {(r.skills?.length || 0) > 0 ? (
            <View>
              <Text
                style={{
                  fontFamily: fontBold,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  borderBottomWidth: 1,
                  borderBottomColor: "#111",
                  paddingBottom: 2,
                  marginBottom: 6,
                  marginTop: 4,
                }}
              >
                Skills
              </Text>
              <SkillsBlock r={r} dense />
            </View>
          ) : null}
        </Page>
      </Document>
    );
  }

  if (layout === "header-strip") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page size="A4" style={{ padding: 0, fontSize: 10, fontFamily: font, color: "#111" }}>
          <View
            style={{
              backgroundColor: "#f1f5f9",
              borderBottomWidth: 2,
              borderBottomColor: opts.accent,
              paddingVertical: 10,
              paddingHorizontal: 36,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fontBold, fontSize: 16 }}>{b.name || "Candidate"}</Text>
              {b.label ? (
                <Text style={{ fontSize: 9, color: opts.accent }}>{b.label}</Text>
              ) : null}
            </View>
            <Text style={{ fontSize: 8, color: "#475569", maxWidth: "48%", textAlign: "right" }}>
              {contactLine(b)}
            </Text>
          </View>
          <View style={{ paddingTop: 18, paddingBottom: 32, paddingHorizontal: 36 }}>
            <MainSections r={r} opts={opts} headingStyle="rule" />
          </View>
        </Page>
      </Document>
    );
  }

  if (layout === "cards") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 32,
            paddingBottom: 32,
            paddingHorizontal: 32,
            fontSize: 9.5,
            fontFamily: font,
            color: "#111",
          }}
        >
          <Text style={{ fontFamily: fontBold, fontSize: 20 }}>{b.name || "Candidate"}</Text>
          {b.label ? (
            <Text style={{ fontSize: 10, color: opts.accent, marginBottom: 2 }}>{b.label}</Text>
          ) : null}
          <Text style={{ fontSize: 9, color: "#475569", marginBottom: 12 }}>{contactLine(b)}</Text>
          {b.summary ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: opts.accent,
                borderRadius: 4,
                padding: 10,
                marginBottom: 10,
                backgroundColor: "#fff7ed",
              }}
            >
              <Text style={{ fontFamily: fontBold, fontSize: 9, color: opts.accent, marginBottom: 4 }}>
                SUMMARY
              </Text>
              <Text style={{ lineHeight: 1.35 }}>{b.summary}</Text>
            </View>
          ) : null}
          {(r.work?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} style="plain" />
              {(r.work || []).map((w, i) => (
                <View
                  key={i}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 4,
                    padding: 10,
                    marginBottom: 8,
                  }}
                  wrap={false}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
                    <Text style={{ fontFamily: fontBold, fontSize: 10 }}>
                      {[w.position, w.name].filter(Boolean).join(" — ")}
                    </Text>
                    <Text style={{ fontSize: 8, color: "#64748b" }}>{workRange(w)}</Text>
                  </View>
                  {(w.highlights || []).map((h, j) => (
                    <Text key={j} style={{ marginLeft: 6, marginTop: 2, fontSize: 9 }}>
                      • {h}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          {(r.skills?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} style="plain" />
              <SkillsBlock r={r} />
            </View>
          ) : null}
          {(r.education?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} style="plain" />
              <EduBlock r={r} fontBold={fontBold} />
            </View>
          ) : null}
        </Page>
      </Document>
    );
  }

  if (layout === "blocks") {
    const block = (label: string, children: React.ReactNode) => (
      <View
        style={{
          backgroundColor: "#f8fafc",
          borderLeftWidth: 4,
          borderLeftColor: opts.accent,
          paddingVertical: 8,
          paddingHorizontal: 12,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fontBold,
            fontSize: 9,
            textTransform: "uppercase",
            color: opts.accent,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        {children}
      </View>
    );
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 28,
            paddingBottom: 28,
            paddingHorizontal: 28,
            fontSize: 9.5,
            fontFamily: font,
            color: "#111",
          }}
        >
          <View
            style={{
              backgroundColor: opts.accent,
              paddingVertical: 14,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: fontBold, fontSize: 18, color: "#fff" }}>
              {b.name || "Candidate"}
            </Text>
            {b.label ? (
              <Text style={{ fontSize: 10, color: "#fff", opacity: 0.9 }}>{b.label}</Text>
            ) : null}
            <Text style={{ fontSize: 8, color: "#fff", opacity: 0.85, marginTop: 4 }}>
              {contactLine(b)}
            </Text>
          </View>
          {b.summary
            ? block("Summary", <Text style={{ lineHeight: 1.35 }}>{b.summary}</Text>)
            : null}
          {(r.work?.length || 0) > 0
            ? block(
                "Experience",
                <WorkBlock r={r} accent={opts.accent} font={font} fontBold={fontBold} />,
              )
            : null}
          {(r.skills?.length || 0) > 0 ? block("Skills", <SkillsBlock r={r} />) : null}
          {(r.education?.length || 0) > 0
            ? block("Education", <EduBlock r={r} fontBold={fontBold} />)
            : null}
          {(r.projects?.length || 0) > 0
            ? block("Projects", <ProjectsBlock r={r} fontBold={fontBold} />)
            : null}
        </Page>
      </Document>
    );
  }

  if (layout === "grid-projects") {
    const projects = r.projects || [];
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 32,
            paddingBottom: 32,
            paddingHorizontal: 32,
            fontSize: 9.5,
            fontFamily: font,
            color: "#111",
          }}
        >
          <Text style={{ fontFamily: fontBold, fontSize: 18 }}>{b.name || "Candidate"}</Text>
          {b.label ? (
            <Text style={{ fontSize: 10, color: opts.accent }}>{b.label}</Text>
          ) : null}
          <Text style={{ fontSize: 9, color: "#475569", marginBottom: 10 }}>{contactLine(b)}</Text>
          {b.summary ? (
            <View style={{ marginBottom: 8 }}>
              <SectionHeading label="Summary" accent={opts.accent} fontBold={fontBold} />
              <Text style={{ lineHeight: 1.35 }}>{b.summary}</Text>
            </View>
          ) : null}
          {(r.work?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} />
              <WorkBlock r={r} accent={opts.accent} font={font} fontBold={fontBold} />
            </View>
          ) : null}
          {projects.length > 0 ? (
            <View>
              <SectionHeading label="Projects" accent={opts.accent} fontBold={fontBold} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {projects.map((p, i) => (
                  <View
                    key={i}
                    style={{
                      width: "48%",
                      borderWidth: 1,
                      borderColor: opts.accent,
                      borderRadius: 3,
                      padding: 8,
                      marginBottom: 4,
                    }}
                    wrap={false}
                  >
                    <Text style={{ fontFamily: fontBold, fontSize: 9 }}>{p.name}</Text>
                    {p.description ? (
                      <Text style={{ fontSize: 8, marginTop: 2, lineHeight: 1.3 }}>
                        {p.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {(r.skills?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} />
              <SkillsBlock r={r} />
            </View>
          ) : null}
          {(r.education?.length || 0) > 0 ? (
            <View>
              <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} />
              <EduBlock r={r} fontBold={fontBold} />
            </View>
          ) : null}
        </Page>
      </Document>
    );
  }

  if (layout === "pull-quote") {
    return (
      <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
        <Page
          size="A4"
          style={{
            paddingTop: 36,
            paddingBottom: 36,
            paddingHorizontal: 40,
            fontSize: 10,
            fontFamily: font,
            color: "#111",
          }}
        >
          <Text style={{ fontFamily: fontBold, fontSize: 22, marginBottom: 2 }}>
            {b.name || "Candidate"}
          </Text>
          {b.label ? (
            <Text style={{ fontSize: 11, color: opts.accent, marginBottom: 4 }}>{b.label}</Text>
          ) : null}
          <Text style={{ fontSize: 9, color: "#57534e", marginBottom: 14 }}>{contactLine(b)}</Text>
          {b.summary ? (
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: opts.accent,
                paddingLeft: 12,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: font,
                  fontSize: 12,
                  lineHeight: 1.45,
                  fontStyle: "italic",
                  color: "#292524",
                }}
              >
                {b.summary}
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ width: "62%" }}>
              {(r.work?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Experience" accent={opts.accent} fontBold={fontBold} />
                  <WorkBlock r={r} accent={opts.accent} font={font} fontBold={fontBold} />
                </View>
              ) : null}
            </View>
            <View style={{ width: "38%" }}>
              {(r.skills?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Skills" accent={opts.accent} fontBold={fontBold} />
                  <SkillsBlock r={r} />
                </View>
              ) : null}
              {(r.education?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Education" accent={opts.accent} fontBold={fontBold} />
                  <EduBlock r={r} fontBold={fontBold} />
                </View>
              ) : null}
              {(r.projects?.length || 0) > 0 ? (
                <View>
                  <SectionHeading label="Projects" accent={opts.accent} fontBold={fontBold} />
                  <ProjectsBlock r={r} fontBold={fontBold} dense />
                </View>
              ) : null}
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // single | dense | serif | mono default column
  const dense = layout === "dense";
  return (
    <Document title={`${b.name || "Resume"} — ${opts.title}`} author={b.name}>
      <Page
        size="A4"
        style={{
          paddingTop: dense ? 26 : 36,
          paddingBottom: dense ? 26 : 36,
          paddingHorizontal: dense ? 30 : 40,
          fontSize: dense ? 9 : 10,
          fontFamily: font,
          color: "#111",
          backgroundColor: opts.pageBg || "#ffffff",
        }}
      >
        <Text style={{ fontFamily: fontBold, fontSize: dense ? 15 : 18, marginBottom: 2 }}>
          {b.name || "Candidate"}
        </Text>
        {b.label ? (
          <Text style={{ fontSize: dense ? 9 : 10, color: opts.accent, marginBottom: 2 }}>
            {b.label}
          </Text>
        ) : null}
        <Text style={{ fontSize: dense ? 8 : 9, color: "#334155", marginBottom: dense ? 8 : 12 }}>
          {contactLine(b)}
        </Text>
        <MainSections
          r={r}
          opts={opts}
          headingStyle={layout === "mono" ? "chip" : dense ? "bar" : "rule"}
          dense={dense}
        />
      </Page>
    </Document>
  );
}
