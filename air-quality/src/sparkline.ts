/** A minimal inline SVG sparkline for a numeric series (nulls skipped). */
export function sparklineSvg(values: (number | null)[], color: string, width = 240, height = 60): string {
  const points: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (v != null) points.push({ i, v });
  });
  if (points.length < 2) {
    return `<svg width="${width}" height="${height}" class="sparkline"></svg>`;
  }
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const pad = 4;
  const n = values.length - 1 || 1;
  const coords = points.map(({ i, v }) => {
    const x = pad + (i / n) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(",");
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline">
      <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="${color}" />
    </svg>
  `;
}
