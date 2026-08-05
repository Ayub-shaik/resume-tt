import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 32, paddingHorizontal: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  meta: { fontSize: 10, color: "#444" },
  contact: { fontSize: 9, marginBottom: 10, color: "#333" },
  cols: { flexDirection: "row", gap: 14 },
  left: { width: "62%" },
  right: { width: "38%" },
  section: { marginTop: 8 },
  heading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 5,
    backgroundColor: "#e2e8f0",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  summary: { lineHeight: 1.3 },
  item: { marginBottom: 6 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  bullet: { marginLeft: 6, marginTop: 1, lineHeight: 1.25 },
  skill: { marginBottom: 3, lineHeight: 1.25 },
});

export function DualDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;
  return (
    <Document title={`${b.name || "Resume"} — Dual`} author={b.name}>
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
        <View style={s.cols}>
          <View style={s.left}>
            {(r.work?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading}>Experience</Text>
                {(r.work || []).map((w, i) => (
                  <View key={i} style={s.item} wrap={false}>
                    <Text style={s.title}>{[w.position, w.name].filter(Boolean).join(" — ")}</Text>
                    <Text style={s.meta}>{workRange(w)}</Text>
                    {(w.highlights || []).map((h, j) => (
                      <Text key={j} style={s.bullet}>• {h}</Text>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <View style={s.right}>
            {(r.skills?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading}>Skills</Text>
                {(r.skills || []).map((sk, i) => (
                  <Text key={i} style={s.skill}>{skillLine(sk)}</Text>
                ))}
              </View>
            ) : null}
            {(r.education?.length || 0) > 0 ? (
              <View style={s.section}>
                <Text style={s.heading}>Education</Text>
                {(r.education || []).map((e, i) => (
                  <View key={i} style={s.item} wrap={false}>
                    <Text style={s.title}>{e.institution}</Text>
                    <Text style={s.meta}>{[e.studyType, e.area].filter(Boolean).join(" · ")}</Text>
                    <Text style={s.meta}>{eduRange(e)}</Text>
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
