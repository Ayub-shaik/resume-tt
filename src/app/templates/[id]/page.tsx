import Link from "next/link";
import { notFound } from "next/navigation";
import { buildLayoutPreviews } from "@/lib/ats/layoutPreview";
import { SAMPLE_LAYOUT_RESUME } from "@/lib/ats/sampleResume";
import { isLayoutId, LAYOUT_META } from "@/lib/ats/templates/shared";

export function generateStaticParams() {
  return LAYOUT_META.map((meta) => ({ id: meta.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = LAYOUT_META.find((t) => t.id === id);
  return {
    title: meta ? `${meta.name} — RocketCV` : "Layout — RocketCV",
    description: meta?.blurb || "A RocketCV resume layout.",
  };
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isLayoutId(id)) notFound();
  const meta = LAYOUT_META.find((t) => t.id === id);
  const previews = await buildLayoutPreviews(SAMPLE_LAYOUT_RESUME);
  const card = previews.find((item) => item.id === id);
  if (!meta || !card) notFound();
  return (
    <main className="rocket-studio min-h-dvh px-4 py-10">
      <article className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/templates" className="text-sm text-[#A39A88]">
          All layouts
        </Link>
        <h1 className="text-3xl font-semibold text-[#FAF6EF]">{meta.name}</h1>
        {card.png ? (
          <img
            src={card.png}
            alt={`${meta.name} sample resume`}
            className="w-full rounded-2xl object-contain"
          />
        ) : null}
        <p className="text-[#FAF6EF]">{card.benefit}</p>
        <p className="text-sm text-[#A39A88]">
          Sample resume only. Sign in to pour your own improved resume into this layout.
        </p>
        <Link href="/" className="rocket-btn text-center">
          Sign in
        </Link>
      </article>
    </main>
  );
}
