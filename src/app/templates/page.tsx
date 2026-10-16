import Link from "next/link";
import { buildLayoutPreviews } from "@/lib/ats/layoutPreview";
import { SAMPLE_LAYOUT_RESUME } from "@/lib/ats/sampleResume";
import { LAYOUT_META } from "@/lib/ats/templates/shared";

export const metadata = {
  title: "Resume layouts — RocketCV",
  description:
    "Eight resume layouts. Each one shows a real page and why you would pick it.",
};

export default async function TemplatesPage() {
  const previews = await buildLayoutPreviews(SAMPLE_LAYOUT_RESUME);
  const byId = new Map(previews.map((card) => [card.id, card]));
  return (
    <main className="rocket-studio min-h-dvh px-4 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-7">
        <header>
          <p className="text-sm text-[#A39A88]">RocketCV</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#FAF6EF]">Layouts</h1>
          <p className="mt-3 text-[#A39A88]">
            These pages use a sample resume so you can compare structures. In the app, the same layouts fill with your improved resume.
          </p>
        </header>
        {LAYOUT_META.map((meta) => {
          const card = byId.get(meta.id as (typeof previews)[number]["id"]);
          return (
            <article key={meta.id} className="rocket-card">
              <h2 className="text-xl font-semibold text-[#FAF6EF]">
                <Link href={`/templates/${meta.id}`}>{meta.name}</Link>
              </h2>
              {card?.png ? (
                <img
                  src={card.png}
                  alt={`${meta.name} sample resume preview`}
                  className="mt-4 max-h-[480px] w-full rounded-2xl object-contain"
                />
              ) : null}
              <p className="mt-3 text-sm text-[#FAF6EF]">{card?.benefit || meta.blurb}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
