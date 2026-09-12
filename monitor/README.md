# SDG World Monitor

A small, static, single-page world map showing one country-level indicator per UN Sustainable Development Goal. Pick a goal, see a choropleth of the latest available World Bank data per country.

The layer-catalog / data-source-catalog structure (`src/layers.ts`) is modeled on the pattern used by [World Monitor](https://www.worldmonitor.app/) ([source](https://github.com/koala73/worldmonitor)) — every data layer is one self-describing entry (id, title, source, unit, "direction") so the map, legend, and popups render generically instead of needing custom code per layer. Everything else is deliberately scoped down: one map engine (MapLibre GL, no globe/Tauri/desktop build), no backend or live feeds — indicator values are fetched from the World Bank API ahead of time and bundled as static JSON, so the whole thing runs as flat files on GitHub Pages.

## Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) for the map (no basemap tiles fetched — the choropleth is rendered directly on a plain background, so the app works fully offline once loaded)
- Data: [World Bank Indicators API](https://data.worldbank.org/) (no API key needed)
- Boundaries: [Natural Earth](https://www.naturalearthdata.com/) 1:110m admin-0 countries (public domain), trimmed to `iso3` + `name` + geometry only

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

## Refresh the bundled data

`public/data/indicators.json` is a point-in-time snapshot. To pull fresh values:

```bash
python3 scripts/fetch_indicators.py
npm run build
```

## Known limitations

- The 1:110m boundary file omits ~48 very small countries/territories (e.g. Malta, Singapore, Pacific island states) — they exist in the underlying data but aren't rendered at this map resolution. A higher-resolution boundary file (1:50m or 1:10m) would fix this at the cost of a larger download.
- Indicators are the best available World Bank proxy per goal, not the official UN Global SDG Indicator — several official indicators (notably for SDG 12 and 14) have too little country-level coverage in the World Bank API to make a useful map.
- No time-series/trend view yet — each layer shows only the most recent available year per country (which varies by country).
