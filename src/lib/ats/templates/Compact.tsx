import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 32, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  contact: { fontSize: 8, color: "#333", marginBottom: 8 },
  section: { marginTop: 7 },
  heading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    backgroundColor: "#f1f5f9",
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  summary: { lineHeight: 1.25 },
  item: { marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  meta: { fontSize: 8, color: "#555" },
  bullet: { marginLeft: 8, marginTop: 1, lineHeight: 1.25 },
  skill: { marginBottom: 2, lineHeight: 1.25 },
});

export function CompactDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;

  return (
    <Document title={`${b.name || "Resume"} — Compact`} author={b.name}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{b.name || "Candidate"}</Text>
        {b.label ? <Text style={s.meta}>{b.label}</Text> : null}
        <Text style={s.contact}>{contactLine(b)}</Text>

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
                <View style={s.row}>
                  <Text style={s.title}>{[w.position, w.name].filter(Boolean).join(" @ ")}</Text>
                  <Text style={s.meta}>{workRange(w)}</Text>
                </View>
                {(w.highlights || []).slice(0, 5).map((h, j) => (
                  <Text key={j} style={s.bullet}>
                    • {h}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {(r.education?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Education</Text>
            {(r.education || []).map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{[e.institution, e.studyType, e.area].filter(Boolean).join(" · ")}</Text>
                  <Text style={s.meta}>{eduRange(e)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {(r.skills?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Skills</Text>
            {(r.skills || []).map((sk, i) => (
              <Text key={i} style={s.skill}>
                {skillLine(sk)}
              </Text>
            ))}
          </View>
        ) : null}

        {(r.projects?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Projects</Text>
            {(r.projects || []).map((p, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Text style={s.title}>{p.name}</Text>
                {(p.highlights || []).slice(0, 3).map((h, j) => (
                  <Text key={j} style={s.bullet}>
                    • {h}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
