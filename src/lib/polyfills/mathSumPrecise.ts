/**
 * pdfjs (via unpdf) calls Math.sumPrecise on Node runtimes that lack it yet.
 * Safe no-op install — uses a Kahan-style compensated sum when missing.
 */
export function ensureMathSumPrecise(): void {
  const m = Math as Math & { sumPrecise?: (values: Iterable<number>) => number };
  if (typeof m.sumPrecise === "function") return;
  m.sumPrecise = (values: Iterable<number>) => {
    let sum = 0;
    let c = 0;
    for (const x of values) {
      const y = Number(x) - c;
      const t = sum + y;
      c = t - sum - y;
      sum = t;
    }
    return sum;
  };
}
