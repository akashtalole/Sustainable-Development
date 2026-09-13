# Carbon Footprint Calculator

A small, static, dependency-free tool: estimate a household's annual CO₂e emissions from travel, home energy, and diet, see which category dominates, get targeted tips, and compare the total against a 1.5°C-aligned target, the current global average, and a selected country's national average (from the same World Bank series used by [`monitor/`](../monitor)).

Picked from [`docs/sdg-ideas.md`](../docs/sdg-ideas.md) under SDG 13 (Climate Action) — "Personal/household carbon footprint calculator: Tracks emissions from travel, energy, and diet with reduction tips."

## Why plain HTML/CSS/JS

Unlike `monitor/` (which needs MapLibre and a build step), this tool has no map, no charting library, and no real complexity beyond arithmetic and DOM updates — so it ships as three plain files with zero dependencies, zero build step, and zero `npm install`. Open `index.html` directly, or serve the folder with any static file server.

## Methodology

Emission factors are rough, commonly-cited public averages (comparable to typical DEFRA/EPA-style consumer calculators), defined in `script.js`:

- **Car** (kg CO₂e/km, by type): small/medium/large petrol, diesel, hybrid, electric (grid-average).
- **Bus / rail** (kg CO₂e per passenger-km).
- **Flights** (kg CO₂e per passenger-km, short-haul vs long-haul), applied against typical round-trip distance assumptions (1,500 km short-haul, 11,000 km long-haul).
- **Home electricity** (kg CO₂e/kWh, rough global grid average — actual grid carbon intensity varies enormously by country, roughly 0.02–0.9 kg/kWh), reduced by the user's stated renewable share.
- **Home heating** (kg CO₂e/kWh of natural gas).
- **Diet** (kg CO₂e/year, by broad dietary pattern — heavy meat, average, low meat, vegetarian, vegan), based on commonly-cited lifecycle estimates (in the range popularized by studies like Poore & Nemecek 2018).

These are **not** country-specific, lifecycle-audited, or a substitute for a professional carbon audit. The point is relative scale and which category to focus on, not a precise personal figure.

Home energy is entered as a household total and divided by household size; travel and diet are entered as personal figures directly.

## Comparison data

`data/co2-per-capita.json` is each country's latest available per-capita CO₂ (excluding LULUCF) from the World Bank (`EN.GHG.CO2.PC.CE.AR5`) — an **all-sectors** national average (industry, transport, power generation, government), not a personal lifestyle figure. The page says so explicitly next to the comparison chart. Refresh it with:

```bash
python3 scripts/fetch_co2_data.py
```

## Known limitations

- No shopping/goods & services category — that's a large share of a real footprint for high-consumption households, but there's no single well-established public factor set for it, so it's left out rather than presenting a made-up number as authoritative.
- Grid electricity carbon intensity is a single global-average factor, not adjusted by the country selected for comparison — a genuinely country-aware electricity factor would meaningfully change results for, say, France (mostly nuclear) vs. Poland (mostly coal).
- Diet categories are broad; there's no per-food-item breakdown.
