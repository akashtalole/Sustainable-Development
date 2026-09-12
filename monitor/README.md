# SDG World Monitor

A small, static, single-page world map showing one country-level indicator per UN Sustainable Development Goal. Pick a goal, see a choropleth of World Bank data per country, drill into any country's full profile across all 17 goals, and see whether each indicator is trending the right way.

The layer-catalog / data-source-catalog structure (`src/layers.ts`) is modeled on the pattern used by [World Monitor](https://www.worldmonitor.app/) ([source](https://github.com/koala73/worldmonitor)) — every data layer is one self-describing entry (id, title, source, unit, "direction") so the map, legend, popups, rankings, and profile panel all render generically instead of needing custom code per layer. Everything else is deliberately scoped down: one map engine (MapLibre GL, no globe/Tauri/desktop build), no backend or live feeds — indicator values (with a multi-year history, not just the latest point) are fetched from the World Bank API ahead of time and bundled as static JSON, so the whole thing runs as flat files on GitHub Pages.

## Features

- **Choropleth per goal** — 17 chips across the top, each toggling a country-colored map layer with a matching quantile legend.
- **Country profile** — click any country (or search for one) to open a panel listing its value, unit, year, a trend sparkline, and an up/down indicator for *all 17 goals at once*. Clicking a row in the profile switches the active map layer to that goal.
- **Rankings** — a sortable, click-to-fly-to list of every country for the currently active goal (best-performing first, direction-aware).
- **Trend indicators** — computed from real multi-year World Bank history (2004–2025 where available), not just a single snapshot: an arrow shows whether the raw value rose or fell over roughly the last 5 years, colored green/red based on whether that's an improvement for that specific indicator's direction.
- **Search** — a lightweight, dependency-free country search (native `<datalist>`) that flies the map to the selected country and opens its profile.
- **Shareable URLs** — `?goal=13&country=BRA` reflects the current goal and selected country, so a specific view can be linked or bookmarked; reloading restores it.

## Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) for the map (no basemap tiles fetched — the choropleth is rendered directly on a plain background, so the app works fully offline once loaded)
- Data: [World Bank Indicators API](https://data.worldbank.org/) (no API key needed), fetched as a 2004–2025 time series per indicator so trends and sparklines are computed from real history
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

- The 1:110m boundary file omits ~48 very small countries/territories (e.g. Malta, Singapore, Pacific island states) — they exist in the underlying data but aren't rendered at this map resolution. A higher-resolution boundary file (1:50m or 1:10m) would fix this at the cost of a larger download. Search and rankings are also limited to the countries that have a rendered polygon.
- Indicators are the best available World Bank proxy per goal, not the official UN Global SDG Indicator — several official indicators (notably for SDG 12 and 14) have too little country-level coverage in the World Bank API to make a useful map.
- Trend arrows compare the latest available year to whichever data point is ~5 years earlier in that country's own series (years aren't perfectly aligned across countries, since World Bank reporting years vary).
