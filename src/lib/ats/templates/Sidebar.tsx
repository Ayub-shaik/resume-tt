import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { certificateLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 8.5, fontFamily: "Helvetica", color: "#111" },
  layout: { flexDirection: "row", minHeight: "100%" },
  side: {
    width: "30%",
    backgroundColor: "#f1f5f9",
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  main: { width: "70%", paddingTop: 18, paddingBottom: 18, paddingHorizontal: 14 },
  name: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sideMeta: { fontSize: 8, color: "#334155", marginBottom: 8 },
  sideLabel: {
    marginTop: 8,
    marginBottom: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#475569",
  },
  sideText: { fontSize: 7.5, marginBottom: 1.5, lineHeight: 1.25, color: "#1e293b" },
  sideTextBold: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  section: { marginBottom: 6 },
  heading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
    marginTop: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 1.5,
  },
  summary: { lineHeight: 1.28, fontSize: 8.5 },
  item: { marginBottom: 5 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  meta: { fontSize: 7.5, color: "#64748b", marginTop: 1, marginBottom: 1 },
  bullet: { marginLeft: 6, marginTop: 1, lineHeight: 1.25, fontSize: 8 },
});

export function SidebarDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;
  return (
    <Document title={`${b.name || "Resume"} — Sidebar`} author={b.name}>
      <Page size="A4" style={s.page}>
        <View style={s.layout}>
          <View style={s.side}>
            <Text style={s.name}>{b.name || "Candidate"}</Text>
            {b.label ? <Text style={s.sideMeta}>{b.label}</Text> : null}
            <Text style={s.sideLabel}>Contact</Text>
            {b.email ? <Text style={s.sideText}>{b.email}</Text> : null}
            {b.phone ? <Text style={s.sideText}>{b.phone}</Text> : null}
            {b.location?.city ? <Text style={s.sideText}>{b.location.city}</Text> : null}
            {b.url ? <Text style={s.sideText}>{b.url}</Text> : null}
            {(r.skills?.length || 0) > 0 ? (
              <View>
                <Text style={s.sideLabel}>Skills</Text>
                {(r.skills || []).map((sk, i) => (
                  <Text key={i} style={s.sideText}>{skillLine(sk)}</Text>
                ))}
              </View>
            ) : null}
            {(r.education?.length || 0) > 0 ? (
              <View>
                <Text style={s.sideLabel}>Education</Text>
                {(r.education || []).map((e, i) => (
                  <View key={i} style={{ marginBottom: 4 }}>
                    <Text style={s.sideTextBold}>{e.institution}</Text>
                    <Text style={s.sideText}>{[e.studyType, e.area].filter(Boolean).join(" · ")}</Text>
                    <Text style={s.sideText}>{eduRange(e)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {(r.certificates?.length || 0) > 0 ? (
              <View>
                <Text style={s.sideLabel}>Certifications</Text>
                {(r.certificates || []).map((c, i) => (
                  <Text key={i} style={s.sideText}>
                    {certificateLine(c)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          <View style={s.main}>
            {b.summary ? (
              <View style={s.section}>
                <Text style={s.heading} minPresenceAhead={36}>
                  Summary
                </Text>
                <Text style={s.summary}>{b.summary}</Text>
              </View>
            ) : null}
            {(r.work?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading} minPresenceAhead={48}>
                  Experience
                </Text>
                {(r.work || []).map((w, i) => (
                  <View key={i} style={s.item} wrap>
                    <Text style={s.title}>{w.position || "Role"}</Text>
                    <Text style={s.meta}>{[w.name, workRange(w)].filter(Boolean).join(" · ")}</Text>
                    {(w.highlights || []).map((h, j) => (
                      <Text key={j} style={s.bullet}>
                        • {h}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
            {(r.projects?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading} minPresenceAhead={40}>
                  Projects
                </Text>
                {(r.projects || []).map((p, i) => (
                  <View key={i} style={s.item} wrap>
                    <Text style={s.title}>{p.name}</Text>
                    {p.description ? (
                      <Text style={s.summary}>{p.description}</Text>
                    ) : null}
                    {(p.highlights || []).map((h, j) => (
                      <Text key={j} style={s.bullet}>
                        • {h}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
            {(r.certificates?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading} minPresenceAhead={32}>
                  Certifications
                </Text>
                {(r.certificates || []).map((c, i) => (
                  <Text key={i} style={s.bullet}>
                    • {certificateLine(c)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
