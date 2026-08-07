import { ensureMathSumPrecise } from "../src/lib/polyfills/mathSumPrecise";
ensureMathSumPrecise();
import { renderResumePdf, TEMPLATE_META } from "../src/lib/ats/templates";
import { pdfBufferToPngPages } from "../src/lib/ats/pdfToPng";

async function main() {
  const jr = {
    basics: {
      name: "Test User",
      email: "t@e.com",
      label: "Engineer",
      summary: "Builds platforms and ships reliably across teams.",
    },
    work: [
      {
        name: "Acme",
        position: "Dev",
        startDate: "2020",
        endDate: "Present",
        highlights: ["Built stuff", "Mentored juniors"],
      },
    ],
    education: [
      {
        institution: "Uni",
        studyType: "BS",
        area: "CS",
        startDate: "2016",
        endDate: "2020",
      },
    ],
    skills: [{ name: "Lang", keywords: ["TS", "Python"] }],
    projects: [
      { name: "Pipeline Kit", description: "Shared YAML templates" },
      { name: "Obs Pack", description: "Dashboards" },
    ],
  };

  console.log("count", TEMPLATE_META.length);
  console.log(
    "ids",
    TEMPLATE_META.map((t) => t.id).join(", "),
  );
  for (const t of TEMPLATE_META) {
    const pdf = await renderResumePdf(t.id, jr);
    const ok = Buffer.from(pdf.slice(0, 5)).toString() === "%PDF-";
    console.log(t.id, ok ? "PDF_OK" : "BAD", pdf.length);
    if (!ok) process.exitCode = 1;
  }
  const pdf = await renderResumePdf("cards", jr);
  const pages = await pdfBufferToPngPages(pdf, { dpi: 100, maxPages: 2 });
  console.log("png pages", pages.length, "first", pages[0].length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
