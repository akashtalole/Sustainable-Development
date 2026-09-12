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
import { loadIndicators, quantileBreaks, type IndicatorTable } from "./data";
import { rampFor } from "./color";

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
map.addControl(new NavigationControl({ showCompass: false }), "top-right");

let indicators: IndicatorTable = {};
let countriesGeojson: GeoJSON.FeatureCollection | null = null;
let activeGoal = 1;

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
  const table = indicators[layer.code] ?? {};
  const values = Object.values(table).map((v) => v.v);
  const breaks = quantileBreaks(values, 5); // length 6: [min,q1,q2,q3,q4,max]
  let ramp = rampFor(layer.color, 5);
  if (layer.direction === "higher-is-better") ramp = [...ramp].reverse();

  // Push a value into each feature's state so the paint expression can read it.
  const iso3s = countriesGeojson
    ? countriesGeojson.features.map((f) => f.properties?.iso3).filter(Boolean)
    : [];
  for (const iso3 of iso3s) {
    const entry = table[iso3 as string];
    map.setFeatureState({ source: SOURCE_ID, id: iso3 as string }, { value: entry ? entry.v : null });
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
}

function setupPopup() {
  const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "260px" });

  map.on("mousemove", FILL_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features?.[0];
    if (!f) return;
    const layer = layerByGoal(activeGoal);
    const table = indicators[layer.code] ?? {};
    const iso3 = f.properties?.iso3 as string;
    const name = f.properties?.name as string;
    const entry = table[iso3];
    const valueLine = entry
      ? `${entry.v.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${layer.unit} <span class="popup-year">(${entry.y})</span>`
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
}

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
    paint: { "line-color": "#0b0f16", "line-width": 0.6 },
  });

  setupPopup();
  setActiveGoal(activeGoal);
}

async function init() {
  buildChips();
  indicators = await loadIndicators();
  countriesGeojson = await fetch(`${import.meta.env.BASE_URL}data/countries.geojson`).then((r) => r.json());
  dataLoaded = true;
  tryStart();
}

init().catch((err) => {
  console.error(err);
  const el = document.getElementById("layer-info");
  if (el) el.textContent = "Failed to load map data. See console for details.";
});
