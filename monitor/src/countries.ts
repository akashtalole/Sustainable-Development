export interface CountryEntry {
  iso3: string;
  name: string;
}

export function countryIndex(geojson: GeoJSON.FeatureCollection): CountryEntry[] {
  const entries: CountryEntry[] = [];
  for (const f of geojson.features) {
    const iso3 = f.properties?.iso3 as string | undefined;
    const name = f.properties?.name as string | undefined;
    if (iso3 && name) entries.push({ iso3, name });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

type Ring = number[][];
type Position = number[];

function eachPosition(coords: unknown, fn: (pos: Position) => void) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number") {
    fn(coords as Position);
    return;
  }
  for (const c of coords as unknown[]) eachPosition(c, fn);
}

/** [[minLng, minLat], [maxLng, maxLat]] bounding box for a Polygon/MultiPolygon geometry. */
export function featureBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const coords = (geometry as { coordinates?: unknown }).coordinates as Ring | undefined;
  if (!coords) return null;
  eachPosition(coords, ([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
