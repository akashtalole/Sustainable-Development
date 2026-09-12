import {
  Map as MaplibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAYERS, layerByGoal, type SdgLayer } from "./layers";
import {
  loadIndicators,
  latestOf,
  latestTable,
  quantileBreaks,
  trendOf,
  type IndicatorTable,
  type IndicatorSeries,
} from "./data";
import { rampFor } from "./color";
import { countryIndex, featureBounds, type CountryEntry } from "./countries";
import { sparklineSvg } from "./sparkline";
import { readUrlState, writeUrlState } from "./url-state";

// See scripts/copy-assets.mjs: MapLibre's tile-processing worker ships as a
// separate file that bundlers can't discover via static analysis, so it's
// copied into public/vendor and pointed to explicitly here.
setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre-gl-worker.mjs`);

const NO_DATA_COLOR = "#2a2f3a";
const SOURCE_ID = "countries";
const FILL_LAYER_ID = "countries-fill";
const LINE_LAYER_ID = "countries-line";

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0b0f16" },
    },
  ],
};

const map = new MaplibreMap({
  container: "map",
  style,
  center: [10, 20],
  zoom: 1.3,
  minZoom: 0.8,
  maxZoom: 6,
  attributionControl: { compact: true },
});
map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

const initialUrlState = readUrlState();

let indicators: IndicatorTable = {};
let countriesGeojson: GeoJSON.FeatureCollection | null = null;
let countries: CountryEntry[] = [];
let countryNameByIso3 = new Map<string, string>();
let countryIso3ByName = new Map<string, string>();

let activeGoal = initialUrlState.goal ?? 1;
let selectedIso3: string | null = null;
type SidePanelMode = "rankings" | "profile" | null;
let sidePanelMode: SidePanelMode = null;

function buildChips() {
  const nav = document.getElementById("goal-nav")!;
  nav.innerHTML = "";
  for (const layer of LAYERS) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.dataset.goal = String(layer.goal);
    btn.style.setProperty("--chip-color", layer.color);
    btn.innerHTML = `<span class="chip-num">${layer.goal}</span><span class="chip-label">${layer.shortTitle}</span>`;
    btn.addEventListener("click", () => setActiveGoal(layer.goal));
    nav.appendChild(btn);
  }
}

function updateChipState() {
  document.querySelectorAll<HTMLButtonElement>(".chip").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.goal) === activeGoal);
  });
}

function applyLayer(layer: SdgLayer) {
  const table = latestTable(indicators[layer.code] ?? {});
  const values = Object.values(table).map((v) => v.value);
  const breaks = quantileBreaks(values, 5); // length 6: [min,q1,q2,q3,q4,max]
  let ramp = rampFor(layer.color, 5);
  if (layer.direction === "higher-is-better") ramp = [...ramp].reverse();

  // Push a value into each feature's state so the paint expression can read it.
  const iso3s = countriesGeojson
    ? countriesGeojson.features.map((f) => f.properties?.iso3).filter(Boolean)
    : [];
  for (const iso3 of iso3s) {
    const entry = table[iso3 as string];
    map.setFeatureState({ source: SOURCE_ID, id: iso3 as string }, { value: entry ? entry.value : null });
  }

  // MapLibre's `step` expression requires strictly ascending input stops.
  // Quantile breaks can repeat (e.g. an indicator where many countries tie
  // at 0), so collapse any non-increasing edge into the previous class
  // rather than passing a duplicate stop.
  const classes: { edge: number; color: string }[] = [];
  let lastEdge = -Infinity;
  for (let i = 1; i < ramp.length; i++) {
    const edge = breaks[i];
    if (edge <= lastEdge) continue;
    classes.push({ edge, color: ramp[i] });
    lastEdge = edge;
  }

  if (classes.length > 0) {
    const stepArgs = classes.flatMap((c) => [c.edge, c.color]);
    const colorExpr = [
      "case",
      ["==", ["feature-state", "value"], null],
      NO_DATA_COLOR,
      ["step", ["feature-state", "value"], ramp[0], ...stepArgs],
    ] as unknown as ExpressionSpecification;
    map.setPaintProperty(FILL_LAYER_ID, "fill-color", colorExpr);
  }

  renderLegend(breaks[0], ramp[0], classes);
  renderHeader(layer);
}

function renderHeader(layer: SdgLayer) {
  const el = document.getElementById("layer-info")!;
  const dirLabel =
    layer.direction === "higher-is-better"
      ? "↑ higher is better"
      : layer.direction === "lower-is-better"
        ? "↓ lower is better"
        : "context indicator";
  el.innerHTML = `
    <div class="layer-title">Goal ${layer.goal} — ${layer.title}</div>
    <div class="layer-meta">${layer.unit} · ${dirLabel} · source: <a href="${layer.sourceUrl}" target="_blank" rel="noopener">${layer.source}</a></div>
  `;
}

function renderLegend(minValue: number, baseColor: string, classes: { edge: number; color: string }[]) {
  const el = document.getElementById("legend")!;
  el.innerHTML = "";
  const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(1));

  const rows = [{ color: baseColor, lo: minValue }, ...classes.map((c) => ({ color: c.color, lo: c.edge }))];
  const swatches = rows
    .map((row, i) => {
      const isLast = i === rows.length - 1;
      const label = isLast ? `${fmt(row.lo)}+` : `${fmt(row.lo)}–${fmt(rows[i + 1].lo)}`;
      return `<div class="legend-row"><span class="swatch" style="background:${row.color}"></span>${label}</div>`;
    })
    .join("");

  el.innerHTML = `
    ${swatches}
    <div class="legend-row"><span class="swatch" style="background:${NO_DATA_COLOR}"></span>no data</div>
  `;
}

function setActiveGoal(goal: number) {
  activeGoal = goal;
  updateChipState();
  applyLayer(layerByGoal(goal));
  syncUrl();
  if (sidePanelMode === "rankings") renderSidePanel();
  if (sidePanelMode === "profile") renderSidePanel(); // active-row highlight depends on activeGoal
}

// --- Selection / highlighting -------------------------------------------

function setSelected(iso3: string | null) {
  if (selectedIso3) {
    map.setFeatureState({ source: SOURCE_ID, id: selectedIso3 }, { selected: false });
  }
  selectedIso3 = iso3;
  if (selectedIso3) {
    map.setFeatureState({ source: SOURCE_ID, id: selectedIso3 }, { selected: true });
  }
}

function flyToIso3(iso3: string) {
  const feature = countriesGeojson?.features.find((f) => f.properties?.iso3 === iso3);
  if (!feature) return;
  const bounds = featureBounds(feature.geometry);
  if (!bounds) return;
  map.fitBounds(bounds, { padding: 60, maxZoom: 4.5, duration: 600 });
}

function selectCountry(iso3: string, opts: { fly?: boolean } = { fly: true }) {
  if (!countryNameByIso3.has(iso3)) return;
  setSelected(iso3);
  if (opts.fly !== false) flyToIso3(iso3);
  const input = document.getElementById("country-search") as HTMLInputElement | null;
  if (input) input.value = countryNameByIso3.get(iso3) ?? "";
  sidePanelMode = "profile";
  openSidePanel();
  renderSidePanel();
  syncUrl();
}

// --- Side panel: rankings + country profile -------------------------------

function openSidePanel() {
  const panel = document.getElementById("side-panel")!;
  panel.hidden = false;
}

function closeSidePanel() {
  const panel = document.getElementById("side-panel")!;
  panel.hidden = true;
  sidePanelMode = null;
  setSelected(null);
  syncUrl();
}

function openRankings() {
  sidePanelMode = "rankings";
  openSidePanel();
  renderSidePanel();
}

function renderSidePanel() {
  const title = document.getElementById("side-panel-title")!;
  const back = document.getElementById("side-panel-back") as HTMLButtonElement;
  const body = document.getElementById("side-panel-body")!;

  if (sidePanelMode === "rankings") {
    back.hidden = true;
    const layer = layerByGoal(activeGoal);
    title.textContent = `Rankings — Goal ${layer.goal}`;
    body.innerHTML = renderRankings(layer);
    body.querySelectorAll<HTMLElement>("[data-iso3]").forEach((row) => {
      row.addEventListener("click", () => selectCountry(row.dataset.iso3!));
    });
  } else if (sidePanelMode === "profile" && selectedIso3) {
    back.hidden = false;
    title.textContent = countryNameByIso3.get(selectedIso3) ?? selectedIso3;
    body.innerHTML = renderProfile(selectedIso3);
    body.querySelectorAll<HTMLElement>("[data-goal]").forEach((row) => {
      row.addEventListener("click", () => setActiveGoal(Number(row.dataset.goal)));
    });
  }
}

function renderRankings(layer: SdgLayer): string {
  const table = latestTable(indicators[layer.code] ?? {});
  const rows = Object.entries(table)
    .map(([iso3, v]) => ({ iso3, name: countryNameByIso3.get(iso3) ?? iso3, value: v.value }))
    .filter((r) => countryNameByIso3.has(r.iso3));

  rows.sort((a, b) => (layer.direction === "lower-is-better" ? a.value - b.value : b.value - a.value));

  if (rows.length === 0) return `<div class="side-panel-empty">No data for this indicator.</div>`;

  const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(1));
  return rows
    .map(
      (r, i) => `
      <div class="ranking-row" data-iso3="${r.iso3}">
        <span class="ranking-rank">${i + 1}</span>
        <span class="ranking-name">${r.name}</span>
        <span class="ranking-value">${fmt(r.value)}</span>
      </div>`
    )
    .join("");
}

function renderProfile(iso3: string): string {
  return LAYERS.map((layer) => {
    const series: IndicatorSeries | undefined = indicators[layer.code]?.[iso3];
    const latest = latestOf(series);
    const trend = trendOf(series, 5);
    const activeCls = layer.goal === activeGoal ? " active" : "";

    if (!latest) {
      return `
        <div class="profile-row" data-goal="${layer.goal}">
          <span class="profile-dot" style="background:${layer.color}"></span>
          <div class="profile-main">
            <div class="profile-label">Goal ${layer.goal} · ${layer.shortTitle}</div>
            <div class="profile-value">no data</div>
          </div>
        </div>`;
    }

    const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(1));
    let trendHtml = "";
    if (trend) {
      const arrow = trend.delta > 0.05 ? "▲" : trend.delta < -0.05 ? "▼" : "–";
      const isGood =
        layer.direction === "higher-is-better"
          ? trend.delta > 0
          : layer.direction === "lower-is-better"
            ? trend.delta < 0
            : null;
      const cls = isGood === null ? "trend-flat" : isGood ? "trend-up" : "trend-down";
      trendHtml = `<span class="trend ${cls}" title="${trend.fromYear}→${trend.toYear}">${arrow} ${fmt(Math.abs(trend.delta))}</span>`;
    }

    return `
      <div class="profile-row${activeCls}" data-goal="${layer.goal}">
        <span class="profile-dot" style="background:${layer.color}"></span>
        <div class="profile-main">
          <div class="profile-label">Goal ${layer.goal} · ${layer.shortTitle}</div>
          <div class="profile-value">${fmt(latest.value)} <span class="popup-year">${layer.unit} (${latest.year})</span></div>
        </div>
        ${series && series.length > 1 ? sparklineSvg(series, layer.color) : ""}
        ${trendHtml}
      </div>`;
  }).join("");
}

// --- Search ---------------------------------------------------------------

function setupSearch() {
  const datalist = document.getElementById("country-list")!;
  datalist.innerHTML = countries.map((c) => `<option value="${c.name}"></option>`).join("");

  const input = document.getElementById("country-search") as HTMLInputElement;
  input.addEventListener("change", () => {
    const iso3 = countryIso3ByName.get(input.value.trim().toLowerCase());
    if (iso3) selectCountry(iso3);
  });
}

// --- URL state --------------------------------------------------------------

function syncUrl() {
  writeUrlState({ goal: activeGoal, country: sidePanelMode === "profile" ? (selectedIso3 ?? undefined) : undefined });
}

// --- Popup ------------------------------------------------------------------

function setupPopup() {
  const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "260px" });

  map.on("mousemove", FILL_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features?.[0];
    if (!f) return;
    const layer = layerByGoal(activeGoal);
    const series = indicators[layer.code]?.[f.properties?.iso3 as string];
    const latest = latestOf(series);
    const name = f.properties?.name as string;
    const valueLine = latest
      ? `${latest.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${layer.unit} <span class="popup-year">(${latest.year})</span>`
      : "no data";
    popup
      .setLngLat(e.lngLat)
      .setHTML(`<strong>${name}</strong><br/>${valueLine}`)
      .addTo(map);
  });

  map.on("mouseleave", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("click", FILL_LAYER_ID, (e) => {
    const f = e.features?.[0];
    const iso3 = f?.properties?.iso3 as string | undefined;
    if (iso3) selectCountry(iso3, { fly: false });
  });
}

// --- Boot -------------------------------------------------------------------

// The inline style has no external resources, so MapLibre's `load` event
// can fire before the async data fetches below resolve. Register the
// listener immediately (it's safe to call this before the map even starts
// loading) and gate the actual setup on both being ready, rather than
// awaiting the fetches first and registering `load` too late to catch it.
let mapLoaded = false;
let dataLoaded = false;

map.on("load", () => {
  mapLoaded = true;
  tryStart();
});

function tryStart() {
  if (!mapLoaded || !dataLoaded) return;

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: countriesGeojson as GeoJSON.FeatureCollection,
    promoteId: "iso3",
  });
  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: { "fill-color": NO_DATA_COLOR, "fill-opacity": 0.9 },
  });
  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#ffffff", "#0b0f16"],
      "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.2, 0.6],
    },
  });

  setupPopup();
  setupSearch();

  document.getElementById("rankings-toggle")!.addEventListener("click", () => {
    if (sidePanelMode === "rankings") {
      closeSidePanel();
    } else {
      openRankings();
    }
  });
  document.getElementById("side-panel-close")!.addEventListener("click", closeSidePanel);
  document.getElementById("side-panel-back")!.addEventListener("click", openRankings);

  setActiveGoal(activeGoal);

  if (initialUrlState.country && countryNameByIso3.has(initialUrlState.country)) {
    selectCountry(initialUrlState.country);
  }
}

async function init() {
  buildChips();
  indicators = await loadIndicators();
  countriesGeojson = await fetch(`${import.meta.env.BASE_URL}data/countries.geojson`).then((r) => r.json());
  countries = countryIndex(countriesGeojson as GeoJSON.FeatureCollection);
  countryNameByIso3 = new Map(countries.map((c) => [c.iso3, c.name]));
  countryIso3ByName = new Map(countries.map((c) => [c.name.toLowerCase(), c.iso3]));
  dataLoaded = true;
  tryStart();
}

init().catch((err) => {
  console.error(err);
  const el = document.getElementById("layer-info");
  if (el) el.textContent = "Failed to load map data. See console for details.";
});
