/** A [year, value] pair. Series are sorted ascending by year. */
export type IndicatorSeries = [number, number][];

/** code -> iso3 -> time series */
export type IndicatorTable = Record<string, Record<string, IndicatorSeries>>;

export interface LatestValue {
  year: number;
  value: number;
}

export interface Trend {
  delta: number;
  fromYear: number;
  toYear: number;
}

let cache: IndicatorTable | null = null;

export async function loadIndicators(): Promise<IndicatorTable> {
  if (cache) return cache;
  const res = await fetch(`${import.meta.env.BASE_URL}data/indicators.json`);
  if (!res.ok) throw new Error(`Failed to load indicators.json: ${res.status}`);
  cache = (await res.json()) as IndicatorTable;
  return cache;
}

export function latestOf(series: IndicatorSeries | undefined): LatestValue | undefined {
  if (!series || series.length === 0) return undefined;
  const [year, value] = series[series.length - 1];
  return { year, value };
}

/** Latest value per country for one indicator's whole table. */
export function latestTable(table: Record<string, IndicatorSeries>): Record<string, LatestValue> {
  const out: Record<string, LatestValue> = {};
  for (const [iso3, series] of Object.entries(table)) {
    const latest = latestOf(series);
    if (latest) out[iso3] = latest;
  }
  return out;
}

/** Change from ~`yearsBack` years before the latest point to the latest point. */
export function trendOf(series: IndicatorSeries | undefined, yearsBack = 5): Trend | undefined {
  if (!series || series.length < 2) return undefined;
  const last = series[series.length - 1];
  let base = series[0];
  for (const point of series) {
    if (last[0] - point[0] >= yearsBack) base = point;
  }
  if (base[0] === last[0]) return undefined;
  return { delta: last[1] - base[1], fromYear: base[0], toYear: last[0] };
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
