# Air Quality Monitor

A static, real-time world map of air quality across major cities — click any station (or use your own location) to see current PM2.5/PM10/AQI, a 48-hour trend chart, and min/max/avg, with alarm-style highlighting for unhealthy readings.

## Where this came from

The dashboard pattern — geographic sensor map, real-time readings, historical min/max/average charts, configurable alarm thresholds with severity indicators — is adapted from [ThingsBoard's environment monitoring use case](https://thingsboard.io/use-cases/environment-monitoring/), an IoT platform demo built around real physical sensors (temperature, humidity, air quality, CO₂, noise) reporting over MQTT/CoAP/LwM2M.

This repo obviously has no physical IoT sensors, so the adaptation is: keep the dashboard *pattern* (map + alarms + history), swap the IoT device layer for a free public air-quality API, and use a curated set of major world cities as "stations" in place of real deployed hardware. It maps directly onto an idea already in [`docs/sdg-ideas.md`](../docs/sdg-ideas.md) under SDG 11 (Sustainable Cities): "Air quality monitoring network (IoT + app): Low-cost sensors feeding a public real-time air quality map with health alerts."

## What makes this one different from the other tools here

`monitor/` and `carbon-calculator/` use **pre-fetched snapshots** (a JSON file checked into the repo, refreshed by a script) because their underlying data — SDG indicators, grid carbon intensity — changes slowly and their source APIs aren't reliably CORS-enabled for direct browser use.

This tool instead calls the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) **live, directly from the browser, on every page load** — no build-time snapshot, no backend. It's free, needs no API key, and is explicitly CORS-open (`Access-Control-Allow-Origin: *`), so this is the one tool in the repo that's genuinely real-time, matching the "live sensor dashboard" framing of the reference it's based on.

## Features

- **Live station map**: ~34 major cities, colored by US AQI category, fetched in a single batched API request (all stations' current readings in one call).
- **Alarm badge**: a header badge counts stations currently "Unhealthy" or worse (US AQI > 150) — the closest static-site equivalent of an IoT platform's configurable alarm rule.
- **Station detail**: click a marker (or a row in the station list) for current PM2.5/PM10/AQI, an EPA health-guidance sentence for the current category, a 48-hour + today PM2.5 sparkline, and min/max/avg over that window.
- **"Use my location"**: browser geolocation adds a live station at your actual coordinates, distinguished on the map with a blue ring, and opens its detail view automatically.
- **Station list**: every station sorted worst-AQI-first, so the most actionable readings surface immediately — click any row to jump to its detail view.

## Stack

Same proven pattern as `monitor/`: Vite + TypeScript + MapLibre GL JS, with `scripts/copy-assets.mjs` copying MapLibre's separately-shipped worker files into `public/vendor/` (see that script's comment, or `monitor/README.md`, for why that's necessary). No pre-fetched data files here — `src/api.ts` calls Open-Meteo directly.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
npm run preview
```

## Known limitations

- Station coverage is a fixed, curated list of major cities, not real ground-truth sensor placement — genuinely local air quality (a specific neighborhood, a specific monitoring station) can differ from what a nearby city-level API point reports.
- US AQI thresholds (0–50 Good … 301+ Hazardous) are the EPA scale; European AQI is also shown per-station but isn't used for the map coloring or alarm badge.
- Open-Meteo's free tier is generous for a project like this (documented around 10,000 calls/day per IP for non-commercial use) but isn't an SLA-backed service — if it's ever down or rate-limited, stations show as "no data" (grey) rather than failing the whole page.
- The trend chart is PM2.5 only, over a fixed ~72-hour window (48h history + today); there's no way to pick a different pollutant or a longer history window yet.
