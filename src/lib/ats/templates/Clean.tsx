import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 36, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  contact: { fontSize: 9, color: "#333", marginBottom: 12 },
  section: { marginTop: 10 },
  heading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 0,
    borderBottomColor: "#222",
    paddingBottom: 2,
    marginBottom: 6,
  },
  summary: { lineHeight: 1.35, marginBottom: 2 },
  item: { marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  meta: { fontSize: 9, color: "#444" },
  bullet: { marginLeft: 10, marginTop: 2, lineHeight: 1.3 },
  skill: { marginBottom: 3, lineHeight: 1.3 },
});

export function CleanDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;

  return (
    <Document title={`${b.name || "Resume"} — Clean`} author={b.name}>
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
                  <Text style={s.title}>{[w.position, w.name].filter(Boolean).join(" — ")}</Text>
                  <Text style={s.meta}>{workRange(w)}</Text>
                </View>
                {w.location ? <Text style={s.meta}>{w.location}</Text> : null}
                {(w.highlights || []).map((h, j) => (
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
                  <Text style={s.title}>{[e.studyType, e.area].filter(Boolean).join(" in ") || e.institution}</Text>
                  <Text style={s.meta}>{eduRange(e)}</Text>
                </View>
                <Text style={s.meta}>{e.institution}</Text>
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
                {p.description ? <Text style={s.summary}>{p.description}</Text> : null}
                {(p.highlights || []).map((h, j) => (
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
