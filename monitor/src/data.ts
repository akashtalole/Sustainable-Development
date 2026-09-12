export interface IndicatorValue {
  v: number;
  y: string;
}

export type IndicatorTable = Record<string, Record<string, IndicatorValue>>;

let cache: IndicatorTable | null = null;

export async function loadIndicators(): Promise<IndicatorTable> {
  if (cache) return cache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/indicators.json`);
  if (!res.ok) throw new Error(`Failed to load indicators.json: ${res.status}`);
  cache = (await res.json()) as IndicatorTable;
  return cache;
}

/** Quantile breakpoints (5 classes) for a set of values, low to high. */
export function quantileBreaks(values: number[], classes = 5): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const breaks: number[] = [];
  for (let i = 0; i <= classes; i++) {
    const idx = Math.min(sorted.length - 1, Math.floor((i / classes) * (sorted.length - 1)));
    breaks.push(sorted[idx]);
  }
  return breaks;
}
