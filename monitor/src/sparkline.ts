import type { IndicatorSeries } from "./data";

/** A minimal inline SVG sparkline for a [year, value][] series. */
export function sparklineSvg(series: IndicatorSeries, color: string, width = 80, height = 24): string {
  if (series.length < 2) {
    return `<svg width="${width}" height="${height}" class="sparkline"></svg>`;
  }
  const values = series.map((p) => p[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const points = series.map(([, v], i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(",");
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline">
      <polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${last[0]}" cy="${last[1]}" r="2" fill="${color}" />
    </svg>
  `;
}
