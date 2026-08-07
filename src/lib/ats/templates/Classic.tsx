import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { certificateLine, contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  name: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  contact: { fontSize: 8, color: "#333", marginBottom: 8 },
  section: { marginTop: 6 },
  heading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#222",
    paddingBottom: 1.5,
    marginBottom: 3,
  },
  summary: { lineHeight: 1.28, marginBottom: 2, fontSize: 8.5 },
  item: { marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  meta: { fontSize: 8, color: "#444" },
  bullet: { marginLeft: 8, marginTop: 1, lineHeight: 1.25, fontSize: 8.5 },
  skill: { marginBottom: 2, lineHeight: 1.25, fontSize: 8.5 },
});

export function ClassicDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;

  return (
    <Document title={`${b.name || "Resume"} — Classic ATS`} author={b.name}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{b.name || "Candidate"}</Text>
        {b.label ? <Text style={s.meta}>{b.label}</Text> : null}
        <Text style={s.contact}>{contactLine(b)}</Text>

        {b.summary ? (
          <View style={s.section}>
            <Text style={s.heading} minPresenceAhead={32}>
              Summary
            </Text>
            <Text style={s.summary}>{b.summary}</Text>
          </View>
        ) : null}

        {(r.work?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading} minPresenceAhead={40}>
              Experience
            </Text>
            {(r.work || []).map((w, i) => (
              <View key={i} style={s.item} wrap>
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
            <Text style={s.heading} minPresenceAhead={28}>
              Education
            </Text>
            {(r.education || []).map((e, i) => (
              <View key={i} style={s.item} wrap>
                <View style={s.row}>
                  <Text style={s.title}>
                    {[e.studyType, e.area].filter(Boolean).join(" in ") || e.institution}
                  </Text>
                  <Text style={s.meta}>{eduRange(e)}</Text>
                </View>
                <Text style={s.meta}>{e.institution}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {(r.skills?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading} minPresenceAhead={24}>
              Skills
            </Text>
            {(r.skills || []).map((sk, i) => (
              <Text key={i} style={s.skill}>
                {skillLine(sk)}
              </Text>
            ))}
          </View>
        ) : null}

        {(r.projects?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading} minPresenceAhead={32}>
              Projects
            </Text>
            {(r.projects || []).map((p, i) => (
              <View key={i} style={s.item} wrap>
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

        {(r.certificates?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading} minPresenceAhead={24}>
              Certifications
            </Text>
            {(r.certificates || []).map((c, i) => (
              <Text key={i} style={s.bullet}>
                • {certificateLine(c)}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
