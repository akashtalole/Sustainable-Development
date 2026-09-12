export function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const num = parseInt(m, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Mix a color with white; t=0 -> white, t=1 -> full color. */
export function tint(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(255 + (c - 255) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** A light-to-full-color ramp with `steps` colors for a given base color. */
export function rampFor(hex: string, steps = 5): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps; // never pure white, always some color at step 0
    out.push(tint(hex, t));
  }
  return out;
}
