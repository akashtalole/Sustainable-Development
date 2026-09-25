import type { Station } from "./stations";

/**
 * Open-Meteo Air Quality API — free, no key, CORS-open, called directly
 * from the browser on every page load (unlike the other tools in this repo,
 * which bundle a pre-fetched snapshot). https://open-meteo.com/en/docs/air-quality-api
 */
const BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface CurrentReading {
  time: string;
  pm2_5: number | null;
  pm10: number | null;
  us_aqi: number | null;
  european_aqi: number | null;
}

export interface HourlySeries {
  time: string[];
  pm2_5: (number | null)[];
  us_aqi: (number | null)[];
}

/** One batched request for every station's current reading, in input order. */
export async function fetchCurrentForStations(stations: Station[]): Promise<Map<string, CurrentReading>> {
  const lat = stations.map((s) => s.lat).join(",");
  const lon = stations.map((s) => s.lon).join(",");
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,european_aqi&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air quality API error: ${res.status}`);
  const data = await res.json();
  const list: { current: CurrentReading }[] = Array.isArray(data) ? data : [data];

  const map = new Map<string, CurrentReading>();
  list.forEach((entry, i) => {
    const station = stations[i];
    if (station && entry?.current) map.set(station.id, entry.current);
  });
  return map;
}

export async function fetchCurrentFor(lat: number, lon: number): Promise<CurrentReading> {
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,european_aqi&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air quality API error: ${res.status}`);
  const data = await res.json();
  return data.current;
}

/** Hourly history (default: last 2 days + today) for one station's trend chart and min/max/avg. */
export async function fetchHistoryFor(lat: number, lon: number, pastDays = 2): Promise<HourlySeries> {
  const url = `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5,us_aqi&past_days=${pastDays}&forecast_days=1&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Air quality API error: ${res.status}`);
  const data = await res.json();
  return data.hourly;
}
