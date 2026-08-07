"use client";

/**
 * Image-stack PDF preview. Native PDF iframe/object embeds of blob: URLs
 * often render blank (Chromium on Linux, mobile Safari). Raster pages are reliable.
 */
export function PdfPreview({
  pages,
  title,
  className,
  pdfUrl,
}: {
  pages: string[];
  title: string;
  className?: string;
  /** Optional blob URL for “Open PDF” / download fallback. */
  pdfUrl?: string | null;
}) {
  if (!pages.length) {
    return (
      <div
        className={`flex min-h-[480px] items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-white/60 text-sm text-[var(--muted)] ${className || ""}`}
      >
        No preview pages
      </div>
    );
  }

  return (
    <div className={`flex min-h-[480px] w-full flex-col ${className || ""}`}>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-[var(--line)] bg-[#ebe7dc] p-3">
        {pages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL page rasters from render API
          <img
            key={`${i}-${src.slice(0, 32)}`}
            src={src}
            alt={`${title} · page ${i + 1}`}
            className="mx-auto block w-full max-w-[720px] bg-white shadow-md"
            draggable={false}
          />
        ))}
      </div>
      {pdfUrl ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Open PDF in new tab
          </a>
        </div>
      ) : null}
    </div>
  );
}
