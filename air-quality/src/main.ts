import { Map as MaplibreMap, Marker, NavigationControl, Popup, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STATIONS, type Station } from "./stations";
import { AQI_CATEGORIES, categoryForAqi, isAlarm } from "./aqi";
import { fetchCurrentFor, fetchCurrentForStations, fetchHistoryFor, type CurrentReading, type HourlySeries } from "./api";
import { sparklineSvg } from "./sparkline";

// See scripts/copy-assets.mjs: MapLibre's tile-processing worker ships as a
// separate file that bundlers can't discover via static analysis, so it's
// copied into public/vendor and pointed to explicitly here.
setWorkerUrl(`${import.meta.env.BASE_URL}vendor/maplibre-gl-worker.mjs`);

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#0b0f16" } }],
};

const map = new MaplibreMap({
  container: "map",
  style,
  center: [15, 20],
  zoom: 1.1,
  minZoom: 0.8,
  maxZoom: 10,
  attributionControl: { compact: true },
});
map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

const USER_STATION_ID = "__you__";
let allStations: Station[] = [...STATIONS];
const readings = new Map<string, CurrentReading>();
const markers = new Map<string, Marker>();
let selectedId: string | null = null;
type PanelMode = "list" | "detail";
let panelMode: PanelMode = "list";

function markerElement(aqi: number | null | undefined, isUser: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "station-marker";
  const cat = aqi != null ? categoryForAqi(aqi) : null;
  el.style.background = cat ? cat.color : "#555";
  if (aqi != null && isAlarm(aqi)) el.classList.add("alarm");
  if (isUser) el.classList.add("user-marker");
  return el;
}

function updateMarker(station: Station) {
  const reading = readings.get(station.id);
  const existing = markers.get(station.id);
  const el = markerElement(reading?.us_aqi, station.id === USER_STATION_ID);
  el.addEventListener("click", () => selectStation(station));
  if (existing) existing.remove();
  const marker = new Marker({ element: el }).setLngLat([station.lon, station.lat]).addTo(map);
  markers.set(station.id, marker);
  setMarkerSelected(station.id, station.id === selectedId);
}

function setMarkerSelected(id: string, selected: boolean) {
  const marker = markers.get(id);
  marker?.getElement().classList.toggle("selected", selected);
}

function renderLegend() {
  const el = document.getElementById("legend-items")!;
  el.innerHTML = AQI_CATEGORIES.map(
    (c) => `<div class="legend-row"><span class="swatch" style="background:${c.color}"></span>${c.label} <span class="legend-range">${legendRange(c)}</span></div>`
  ).join("");
}

function legendRange(c: (typeof AQI_CATEGORIES)[number]): string {
  const idx = AQI_CATEGORIES.indexOf(c);
  const lo = idx === 0 ? 0 : AQI_CATEGORIES[idx - 1].max + 1;
  return c.max === Infinity ? `${lo}+` : `${lo}–${c.max}`;
}

function renderAlarmBadge() {
  const badge = document.getElementById("alarm-badge")!;
  const count = allStations.filter((s) => isAlarm(readings.get(s.id)?.us_aqi ?? -1)).length;
  if (count > 0) {
    badge.hidden = false;
    badge.textContent = `${count} unhealthy+`;
  } else {
    badge.hidden = true;
  }
}

function openSidePanel() {
  document.getElementById("side-panel")!.hidden = false;
}

function closeSidePanel() {
  document.getElementById("side-panel")!.hidden = true;
}

function showList() {
  panelMode = "list";
  if (selectedId) setMarkerSelected(selectedId, false);
  selectedId = null;
  openSidePanel();
  renderPanel();
}

function fmt(n: number | null | undefined, digits = 1): string {
  return n == null ? "—" : n.toFixed(digits);
}

function renderPanel() {
  const back = document.getElementById("side-panel-back") as HTMLButtonElement;
  const title = document.getElementById("side-panel-title")!;
  const body = document.getElementById("side-panel-body")!;

  if (panelMode === "list") {
    back.hidden = true;
    title.textContent = `Stations (${allStations.length})`;
    const rows = [...allStations].sort((a, b) => (readings.get(b.id)?.us_aqi ?? -1) - (readings.get(a.id)?.us_aqi ?? -1));
    body.innerHTML = rows
      .map((s) => {
        const r = readings.get(s.id);
        const aqi = r?.us_aqi;
        const cat = aqi != null ? categoryForAqi(aqi) : null;
        return `
        <div class="station-row" data-id="${s.id}">
          <span class="station-dot" style="background:${cat ? cat.color : "#555"}"></span>
          <span class="station-name">${s.city === "Your location" ? "📍 " : ""}${s.city}<span class="station-country">${s.country}</span></span>
          <span class="station-aqi">${aqi != null ? Math.round(aqi) : "—"}</span>
        </div>`;
      })
      .join("");
    body.querySelectorAll<HTMLElement>("[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const station = allStations.find((s) => s.id === row.dataset.id);
        if (station) selectStation(station);
      });
    });
  } else if (panelMode === "detail" && selectedId) {
    const station = allStations.find((s) => s.id === selectedId);
    if (!station) return;
    back.hidden = false;
    title.textContent = station.city;
    body.innerHTML = `<div class="station-loading">Loading readings…</div>`;
    renderDetail(station);
  }
}

async function renderDetail(station: Station) {
  const body = document.getElementById("side-panel-body")!;
  const reading = readings.get(station.id);
  const aqi = reading?.us_aqi;
  const cat = aqi != null ? categoryForAqi(aqi) : null;

  let history: HourlySeries | null = null;
  try {
    history = await fetchHistoryFor(station.lat, station.lon);
  } catch (err) {
    console.error(err);
  }

  // Bail out if the user picked a different station while this was loading.
  if (selectedId !== station.id) return;

  const pm25Series = history?.pm2_5 ?? [];
  const validPm25 = pm25Series.filter((v): v is number => v != null);
  const min = validPm25.length ? Math.min(...validPm25) : null;
  const max = validPm25.length ? Math.max(...validPm25) : null;
  const avg = validPm25.length ? validPm25.reduce((a, b) => a + b, 0) / validPm25.length : null;

  body.innerHTML = `
    <div class="detail-header">
      <span class="aqi-badge" style="background:${cat ? cat.color : "#555"};color:${cat ? cat.textColor : "#fff"}">
        ${aqi != null ? Math.round(aqi) : "—"} ${cat ? cat.label : ""}
      </span>
      <div class="station-meta">${station.country} · updated ${reading?.time ? new Date(reading.time + "Z").toLocaleString() : "—"}</div>
    </div>

    <div class="reading-grid">
      <div class="reading-cell"><div class="reading-label">PM2.5</div><div class="reading-value">${fmt(reading?.pm2_5)}<span class="reading-unit"> µg/m³</span></div></div>
      <div class="reading-cell"><div class="reading-label">PM10</div><div class="reading-value">${fmt(reading?.pm10)}<span class="reading-unit"> µg/m³</span></div></div>
      <div class="reading-cell"><div class="reading-label">European AQI</div><div class="reading-value">${reading?.european_aqi != null ? Math.round(reading.european_aqi) : "—"}</div></div>
    </div>

    ${cat ? `<p class="aqi-guidance">${cat.guidance}</p>` : ""}

    <div class="chart-section">
      <div class="chart-title">PM2.5, last 48h + today</div>
      ${pm25Series.length ? sparklineSvg(pm25Series, cat ? cat.color : "#0a97d9") : `<div class="station-loading">No historical data available.</div>`}
      <div class="minmax-row">
        <span>Min: ${fmt(min)}</span>
        <span>Avg: ${fmt(avg)}</span>
        <span>Max: ${fmt(max)}</span>
      </div>
    </div>
  `;
}

function selectStation(station: Station) {
  if (selectedId) setMarkerSelected(selectedId, false);
  selectedId = station.id;
  setMarkerSelected(station.id, true);
  panelMode = "detail";
  openSidePanel();
  renderPanel();
  map.flyTo({ center: [station.lon, station.lat], zoom: Math.max(map.getZoom(), 4), duration: 700 });
}

function setupHoverPopup() {
  const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 14 });
  // Marker elements are plain DOM nodes; delegate hover via mouseenter on the map container's markers.
  map.getContainer().addEventListener(
    "mouseover",
    (e) => {
      const target = (e.target as HTMLElement).closest(".station-marker") as HTMLElement | null;
      if (!target) return;
      const entry = [...markers.entries()].find(([, m]) => m.getElement() === target);
      if (!entry) return;
      const [id] = entry;
      const station = allStations.find((s) => s.id === id);
      const reading = readings.get(id);
      if (!station) return;
      const aqi = reading?.us_aqi;
      const cat = aqi != null ? categoryForAqi(aqi) : null;
      popup
        .setLngLat([station.lon, station.lat])
        .setHTML(`<strong>${station.city}</strong><br/>${aqi != null ? `AQI ${Math.round(aqi)} — ${cat?.label}` : "no data"}`)
        .addTo(map);
    },
    true
  );
  map.getContainer().addEventListener(
    "mouseout",
    (e) => {
      const target = (e.target as HTMLElement).closest(".station-marker");
      if (target) popup.remove();
    },
    true
  );
}

function setupLocate() {
  const btn = document.getElementById("locate-btn") as HTMLButtonElement;
  btn.addEventListener("click", async () => {
    if (!("geolocation" in navigator)) {
      btn.textContent = "Not supported";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const userStation: Station = { id: USER_STATION_ID, city: "Your location", country: "", lat: latitude, lon: longitude };
        allStations = allStations.filter((s) => s.id !== USER_STATION_ID);
        allStations.push(userStation);
        try {
          const current = await fetchCurrentFor(latitude, longitude);
          readings.set(USER_STATION_ID, current);
        } catch (err) {
          console.error(err);
        }
        updateMarker(userStation);
        renderAlarmBadge();
        selectStation(userStation);
        btn.disabled = false;
        btn.textContent = "Use my location";
      },
      (err) => {
        console.error(err);
        btn.disabled = false;
        btn.textContent = err.code === err.PERMISSION_DENIED ? "Location denied" : "Location failed";
        setTimeout(() => (btn.textContent = "Use my location"), 2500);
      },
      { timeout: 10000 }
    );
  });
}

async function init() {
  renderLegend();

  document.getElementById("list-toggle")!.addEventListener("click", () => {
    if (!document.getElementById("side-panel")!.hidden && panelMode === "list") {
      closeSidePanel();
    } else {
      showList();
    }
  });
  document.getElementById("side-panel-close")!.addEventListener("click", closeSidePanel);
  document.getElementById("side-panel-back")!.addEventListener("click", showList);
  setupLocate();

  map.on("load", async () => {
    setupHoverPopup();
    for (const station of allStations) updateMarker(station); // render immediately with "no data" grey, fill in as fetch resolves

    try {
      const current = await fetchCurrentForStations(allStations);
      current.forEach((reading, id) => readings.set(id, reading));
    } catch (err) {
      console.error(err);
    }
    for (const station of allStations) updateMarker(station);
    renderAlarmBadge();
    showList();
  });
}

init().catch((err) => {
  console.error(err);
});
