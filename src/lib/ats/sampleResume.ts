import type { JsonResume } from "@/lib/ats/jsonresume";

/** Public gallery only. The product studio never uses this as a stand-in. */
export const SAMPLE_LAYOUT_RESUME: JsonResume = {
  basics: {
    name: "Amina Rahman",
    label: "Platform engineer",
    email: "amina.rahman@example.com",
    phone: "+1 202 555 0148",
    url: "https://example.com/amina",
    summary:
      "Builds internal platforms and the pipelines teams use to ship them. Keeps production changes small and reversible.",
    location: { city: "Austin" },
  },
  work: [
    {
      name: "Northwind",
      position: "Platform engineer",
      startDate: "2021-04",
      endDate: "Present",
      highlights: [
        "Cut release lead time by keeping one pipeline for every service.",
        "Moved cluster config into Terraform modules other teams could reuse.",
      ],
    },
    {
      name: "Harbor Labs",
      position: "Software engineer",
      startDate: "2018-06",
      endDate: "2021-03",
      highlights: ["Owned on-call for the billing API and wrote the runbooks."],
    },
  ],
  education: [
    {
      institution: "State University",
      area: "Computer science",
      studyType: "BSc",
      startDate: "2014",
      endDate: "2018",
    },
  ],
  skills: [
    { name: "Kubernetes", keywords: ["Terraform", "CI/CD"] },
    { name: "Python", keywords: ["Go"] },
  ],
};
