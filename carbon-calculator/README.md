# Carbon Footprint Calculator

A small, static, dependency-free tool: estimate a household's annual CO₂e emissions from travel, home energy, diet, and shopping, see which category dominates, get targeted tips, and compare the total against a 1.5°C-aligned target, the current global average, and a selected country's national average.

Picked from [`docs/sdg-ideas.md`](../docs/sdg-ideas.md) under SDG 13 (Climate Action) — "Personal/household carbon footprint calculator: Tracks emissions from travel, energy, and diet with reduction tips."

## Why plain HTML/CSS/JS

Unlike `monitor/` (which needs MapLibre and a build step), this tool has no map, no charting library, and no real complexity beyond arithmetic and DOM updates — so it ships as three plain files with zero dependencies, zero build step, and zero `npm install`. Open `index.html` directly, or serve the folder with any static file server.

## Features

- **Country-aware electricity**: once you pick a country, your home electricity emissions use that country's actual grid carbon intensity (gCO₂/kWh) instead of a flat global average — this one factor varies 20x+ between grids (e.g. ~41 gCO₂/kWh in France's nuclear-heavy grid vs. ~590 gCO₂/kWh in Poland's coal-heavy one), so it matters far more than most of the other inputs combined.
- **Four categories**: travel, home energy, diet, and shopping & goods (the last one clearly flagged as the roughest estimate — see Methodology).
- **National comparison**: your total plotted against a 1.5°C-aligned 2030 target, the current global average, and your selected country's national per-capita figure (explicitly caveated as an all-sectors figure, not a personal one).
- **Targeted tips**: rule-based, keyed to whichever category is currently your largest.
- **Shareable links**: "Copy shareable link" encodes every input into the URL query string, so a specific scenario can be sent to someone else or bookmarked; loading such a link restores it exactly (and takes priority over anything saved locally).
- **Diet fine-tuning**: a "red meat meals per week" field sits below the diet-pattern dropdown, auto-set to that pattern's typical value and editable from there — see Methodology for how the delta is calculated.
- **Saved scenarios**: save up to 6 named "what if" snapshots of your current inputs, see them compared against your current total on a shared bar chart, click a name to reload it, or delete it. Scenarios store inputs, not frozen numbers, so they stay accurate if the underlying data or methodology changes later.
- **Export**: "Download summary" saves a plain-text report of your inputs and results to your device; a print stylesheet also makes Ctrl/Cmd+P produce a clean, form-free report instead of printing the interactive page as-is.
- **Local persistence**: inputs (and saved scenarios) are auto-saved to `localStorage` between visits. Nothing is ever sent to a server — this is a fully static, client-side page.

## Methodology

Emission factors are rough, commonly-cited public averages (comparable to typical DEFRA/EPA-style consumer calculators), defined in `script.js`:

- **Car** (kg CO₂e/km, by type): small/medium/large petrol, diesel, hybrid, electric (using the same country-aware grid factor as home electricity).
- **Bus / rail** (kg CO₂e per passenger-km).
- **Flights** (kg CO₂e per passenger-km, short-haul vs long-haul), applied against typical round-trip distance assumptions (1,500 km short-haul, 11,000 km long-haul).
- **Home electricity** (kg CO₂e/kWh) — country-specific grid intensity when a country is selected (see Comparison & grid data below), else a rough global average fallback (0.475 kg/kWh) — reduced further by any stated "extra green tariff" share on top of the grid.
- **Home heating** (kg CO₂e/kWh of natural gas).
- **Diet** (kg CO₂e/year, by broad dietary pattern — heavy meat, average, low meat, vegetarian, vegan), based on commonly-cited lifecycle estimates (in the range popularized by studies like Poore & Nemecek 2018), adjusted up or down from the "red meat meals per week" field: each pattern implies a typical weekly frequency (7/3/0.5/0/0), and the field's value is compared against that implied figure using ~6.5 kg CO₂e per beef/lamb meal as the delta rate — not an independent per-food-item model, just a single tunable lever on top of the pattern baseline.
- **Shopping & goods** (kg CO₂e/year, by a subjective consumption level) — a broad, EEIO-style ballpark (in the spirit of lifestyle-footprint studies like Ivanova et al. 2016), explicitly the least precise category in the tool. Included because it's a real and often large share of a footprint, but the page and this README both flag it as directional rather than exact.

None of this is lifecycle-audited or a substitute for a professional carbon audit. The point is relative scale and which category to focus on, not a precise personal figure.

Home energy is entered as a household total and divided by household size; travel, diet, and shopping are entered as personal figures directly.

## Comparison & grid data

- `data/co2-per-capita.json` — each country's latest available per-capita CO₂ (excluding LULUCF) from the World Bank (`EN.GHG.CO2.PC.CE.AR5`) — an **all-sectors** national average (industry, transport, power generation, government), not a personal lifestyle figure. Refresh with `python3 scripts/fetch_co2_data.py`.
- `data/grid-intensity.json` — each country's latest electricity grid carbon intensity (gCO₂/kWh), from [Our World in Data's Ember-sourced dataset](https://ourworldindata.org/grapher/carbon-intensity-electricity). Refresh with `python3 scripts/fetch_grid_intensity.py`.

## Known limitations

- Diet granularity is a single "red meat frequency" lever, not a full per-food-item breakdown (poultry, fish, dairy, and plant intake are still folded into the flat pattern baseline).
- The shopping & goods category is a rough consumption-level mapping, not a bottom-up calculation — see Methodology.
- Car "electric" mode uses the same grid factor as home electricity, which is directionally right but doesn't account for charging-time-of-day effects or a dedicated EV tariff.
- Saved scenarios live in `localStorage`, so they're per-browser, not synced across devices — "Copy shareable link" is the way to move a specific scenario elsewhere.
