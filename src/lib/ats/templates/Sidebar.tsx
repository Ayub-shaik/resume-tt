import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 9.5, fontFamily: "Helvetica", color: "#111" },
  layout: { flexDirection: "row", minHeight: "100%" },
  side: {
    width: "32%",
    backgroundColor: "#f1f5f9",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 14,
  },
  main: { width: "68%", paddingTop: 28, paddingBottom: 28, paddingHorizontal: 18 },
  name: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sideMeta: { fontSize: 9, color: "#334155", marginBottom: 12 },
  sideLabel: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#475569",
  },
  sideText: { fontSize: 8.5, marginBottom: 2, lineHeight: 1.3, color: "#1e293b" },
  sideTextBold: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  section: { marginBottom: 10 },
  heading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
  },
  summary: { lineHeight: 1.35 },
  item: { marginBottom: 8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  meta: { fontSize: 8.5, color: "#64748b", marginTop: 1, marginBottom: 2 },
  bullet: { marginLeft: 6, marginTop: 2, lineHeight: 1.3 },
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
                  <View key={i} style={{ marginBottom: 6 }}>
                    <Text style={s.sideTextBold}>{e.institution}</Text>
                    <Text style={s.sideText}>{[e.studyType, e.area].filter(Boolean).join(" · ")}</Text>
                    <Text style={s.sideText}>{eduRange(e)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={s.main}>
            {b.summary ? (
              <View style={s.section}>
                <Text style={s.heading}>Summary</Text>
                <Text style={s.summary}>{b.summary}</Text>
              </View>
            ) : null}
            {(r.work?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading}>Experience</Text>
                {(r.work || []).map((w, i) => (
                  <View key={i} style={s.item} wrap={false}>
                    <Text style={s.title}>{w.position || "Role"}</Text>
                    <Text style={s.meta}>{[w.name, workRange(w)].filter(Boolean).join(" · ")}</Text>
                    {(w.highlights || []).map((h, j) => (
                      <Text key={j} style={s.bullet}>• {h}</Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
            {(r.projects?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading}>Projects</Text>
                {(r.projects || []).map((p, i) => (
                  <View key={i} style={s.item} wrap={false}>
                    <Text style={s.title}>{p.name}</Text>
                    {(p.highlights || []).map((h, j) => (
                      <Text key={j} style={s.bullet}>• {h}</Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
