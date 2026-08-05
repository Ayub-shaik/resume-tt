import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  meta: { fontSize: 10, color: "#444" },
  contact: { fontSize: 9, marginBottom: 12, color: "#333" },
  section: { marginTop: 10 },
  heading: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 6, textTransform: "uppercase", color: "#0f172a" },
  summary: { lineHeight: 1.35 },
  item: { marginBottom: 8, flexDirection: "row", gap: 10 },
  dateCol: { width: 78, fontSize: 8, color: "#64748b" },
  bodyCol: { flex: 1 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  bullet: { marginLeft: 6, marginTop: 2, lineHeight: 1.3 },
  skill: { marginBottom: 3 },
});

export function TimelineDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;
  return (
    <Document title={`${b.name || "Resume"} — Timeline`} author={b.name}>
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
                <Text style={s.dateCol}>{workRange(w)}</Text>
                <View style={s.bodyCol}>
                  <Text style={s.title}>{[w.position, w.name].filter(Boolean).join(" — ")}</Text>
                  {(w.highlights || []).map((h, j) => (
                    <Text key={j} style={s.bullet}>• {h}</Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {(r.education?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Education</Text>
            {(r.education || []).map((e, i) => (
              <View key={i} style={s.item} wrap={false}>
                <Text style={s.dateCol}>{eduRange(e)}</Text>
                <View style={s.bodyCol}>
                  <Text style={s.title}>{e.institution}</Text>
                  <Text style={s.meta}>{[e.studyType, e.area].filter(Boolean).join(" · ")}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {(r.skills?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Skills</Text>
            {(r.skills || []).map((sk, i) => (
              <Text key={i} style={s.skill}>{skillLine(sk)}</Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
