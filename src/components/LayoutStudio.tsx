"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import type { JsonResume } from "@/lib/ats/jsonresume";

type Card = {
  id: string;
  name: string;
  png: string;
  parserScore: number;
  survived: string;
  benefit: string;
};

export function LayoutStudio({
  jsonResume,
  selectedTemplate,
  onSelect,
  preparing,
  onPrepare,
}: {
  jsonResume: JsonResume | null;
  selectedTemplate: string;
  onSelect: (id: string) => void;
  preparing: boolean;
  onPrepare: () => void;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const key = jsonResume ? JSON.stringify(jsonResume) : "";

  useEffect(() => {
    if (!key) {
      setCards([]);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/ats/layout-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: JSON.parse(key) }),
      signal: ac.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Layout preview failed");
        setCards(Array.isArray(data.layouts) ? data.layouts : []);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Layout preview failed");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [key]);

  if (!jsonResume) {
    return (
      <section className="rocket-card">
        <h3 className="text-lg font-semibold text-[#FAF6EF]">Prepare pages</h3>
        <p className="mt-2 text-sm text-[#A39A88]">
          Turn the improved resume into the eight layouts.
        </p>
        <button
          type="button"
          className="rocket-btn mt-4"
          disabled={preparing}
          onClick={onPrepare}
        >
          {preparing ? "Preparing pages…" : "Prepare pages"}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#A39A88]">
        Each page is your resume. The ring is how much of that PDF a text extract kept.
      </p>
      {loading ? <p className="text-sm text-[#A39A88]">Rendering layouts…</p> : null}
      {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}
      {cards.map((card) => {
        const selected = selectedTemplate === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className={`rocket-card w-full text-left ${selected ? "rocket-card--selected" : ""}`}
          >
            <p className="text-lg font-semibold text-[#FAF6EF]">{card.name}</p>
            {card.png ? (
              <img
                src={card.png}
                alt={`${card.name} preview of your resume`}
                className="mt-3 max-h-[420px] w-full rounded-2xl object-contain"
              />
            ) : null}
            <div className="mt-4">
              <ScoreRing
                label="Parser"
                valueText={String(card.parserScore)}
                fraction={card.parserScore / 100}
              />
            </div>
            <p className="mt-3 text-sm text-[#FAF6EF]">{card.survived}</p>
            <p className="mt-1 text-sm text-[#A39A88]">{card.benefit}</p>
          </button>
        );
      })}
    </div>
  );
}
