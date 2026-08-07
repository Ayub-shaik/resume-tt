"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TemplateThumb } from "@/components/TemplateThumb";
import {
  TEMPLATE_META,
  type TemplateId,
} from "@/lib/ats/templates";

/**
 * Full-page swipeable template gallery.
 * Tap a gallery thumb → open this; swipe all templates; Select template at bottom.
 */
export function TemplateGalleryModal({
  open,
  initialId,
  onClose,
  onSelect,
}: {
  open: boolean;
  initialId: TemplateId;
  onClose: () => void;
  onSelect: (id: TemplateId) => void;
}) {
  const list = TEMPLATE_META;
  const startIndex = Math.max(
    0,
    list.findIndex((t) => t.id === initialId),
  );
  const [index, setIndex] = useState(startIndex);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, list.findIndex((t) => t.id === initialId)));
    }
  }, [open, initialId, list]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return list.length - 1;
        if (next >= list.length) return 0;
        return next;
      });
    },
    [list.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Enter") {
        const t = list[index];
        if (t) onSelect(t.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, onClose, onSelect, list, index]);

  if (!open) return null;
  const current = list[index] || list[0];
  if (!current) return null;

  return (
    <div className="template-gallery-modal" role="dialog" aria-modal="true" aria-label="Template preview">
      <button
        type="button"
        className="template-gallery-modal__backdrop"
        aria-label="Close gallery"
        onClick={onClose}
      />
      <div
        className="template-gallery-modal__panel"
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) < 48) return;
          go(dx < 0 ? 1 : -1);
        }}
      >
        <header className="template-gallery-modal__head">
          <div className="min-w-0">
            <p className="template-gallery-modal__eyebrow">
              {current.category} · {index + 1} / {list.length}
            </p>
            <h2 className="template-gallery-modal__title">{current.name}</h2>
            <p className="template-gallery-modal__sub">{current.blurb}</p>
          </div>
          <button type="button" className="drive-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="template-gallery-modal__stage">
          <button
            type="button"
            className="template-gallery-modal__nav"
            aria-label="Previous template"
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <div className="template-gallery-modal__sheet">
            <TemplateThumb id={current.id} accent={current.accent} fullPage />
          </div>
          <button
            type="button"
            className="template-gallery-modal__nav"
            aria-label="Next template"
            onClick={() => go(1)}
          >
            ›
          </button>
        </div>

        <footer className="template-gallery-modal__foot">
          <button
            type="button"
            className="btn-primary w-full max-w-md px-4 py-3 text-sm sm:text-base"
            onClick={() => onSelect(current.id)}
          >
            Select template
          </button>
        </footer>
      </div>
    </div>
  );
}
