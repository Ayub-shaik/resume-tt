import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { NormalizedResume } from "./shared";
import { contactLine, eduRange, skillLine, workRange } from "./shared";

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#1c1917",
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: "#1c1917",
    paddingBottom: 10,
  },
  name: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: "#1c1917",
    marginBottom: 3,
  },
  label: { fontSize: 11, color: "#44403c", marginBottom: 4 },
  contact: { fontSize: 9, color: "#57534e" },
  section: { marginTop: 12 },
  heading: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    color: "#1c1917",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  summary: { lineHeight: 1.4, color: "#292524" },
  item: { marginBottom: 9 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { fontFamily: "Times-Bold", fontSize: 10.5 },
  company: { fontSize: 9.5, color: "#57534e", marginTop: 1 },
  meta: { fontSize: 9, color: "#78716c" },
  bullet: { marginLeft: 8, marginTop: 2, lineHeight: 1.35 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  skillChip: { fontSize: 9, marginRight: 8, marginBottom: 3 },
});

export function ProfessionalDocument({ data }: { data: NormalizedResume }) {
  const r = data;
  const b = r.basics;

  return (
    <Document title={`${b.name || "Resume"} — Professional`} author={b.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{b.name || "Candidate"}</Text>
          {b.label ? <Text style={s.label}>{b.label}</Text> : null}
          <Text style={s.contact}>{contactLine(b)}</Text>
        </View>

        {b.summary ? (
          <View style={s.section}>
            <Text style={s.heading}>Profile</Text>
            <Text style={s.summary}>{b.summary}</Text>
          </View>
        ) : null}

        {(r.work?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Experience</Text>
            {(r.work || []).map((w, i) => (
              <View key={i} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.title}>{w.position || "Role"}</Text>
                  <Text style={s.meta}>{workRange(w)}</Text>
                </View>
                <Text style={s.company}>
                  {[w.name, w.location].filter(Boolean).join(" · ")}
                </Text>
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
                  <Text style={s.title}>{e.institution}</Text>
                  <Text style={s.meta}>{eduRange(e)}</Text>
                </View>
                <Text style={s.company}>
                  {[e.studyType, e.area].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {(r.skills?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Skills</Text>
            <View style={s.skillsWrap}>
              {(r.skills || []).map((sk, i) => (
                <Text key={i} style={s.skillChip}>
                  {skillLine(sk)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {(r.projects?.length || 0) > 0 ? (
          <View style={s.section}>
            <Text style={s.heading}>Projects</Text>
            {(r.projects || []).map((p, i) => (
              <View key={i} style={s.item} wrap={false}>
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
      </Page>
    </Document>
  );
}
