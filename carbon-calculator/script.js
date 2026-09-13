"use strict";

/**
 * Emission factors are rough, commonly-cited public averages (comparable to
 * the kind used by DEFRA/EPA-style consumer calculators), not
 * country-specific or lifecycle-audited figures. See README.md for sources
 * and caveats. Everything here is meant to show relative impact and rough
 * scale, not a precise personal audit.
 */
const FACTORS = {
  car: {
    // kg CO2e per km
    none: 0,
    small: 0.147,
    medium: 0.17,
    large: 0.235,
    diesel: 0.164,
    hybrid: 0.109,
    electric: 0.053,
  },
  bus: 0.105, // kg CO2e per passenger-km
  rail: 0.041, // kg CO2e per passenger-km
  flightShortPerKm: 0.151, // kg CO2e per passenger-km, economy short-haul
  flightLongPerKm: 0.115, // kg CO2e per passenger-km, economy long-haul
  flightShortRoundTripKm: 1500, // typical short-haul round trip distance
  flightLongRoundTripKm: 11000, // typical long-haul round trip distance
  electricityPerKwh: 0.475, // kg CO2e per kWh, rough global grid average
  gasPerKwh: 0.203, // kg CO2e per kWh, natural gas combustion
};

// Rough annual personal footprint by diet type, in kg CO2e/year.
const DIET_FOOTPRINT_KG = {
  heavy: 3300,
  average: 2500,
  low: 1900,
  vegetarian: 1700,
  vegan: 1500,
};

// Reference points for the comparison chart (all in tCO2e/person/year).
const REFERENCE = {
  target2030: { label: "1.5°C-aligned 2030 target", value: 2.3 },
  globalAvg: { label: "Current global average", value: 4.7 },
};

const FIELDS = [
  { id: "carType", kind: "select", default: "medium" },
  { id: "carKmWeekly", kind: "number", default: 100 },
  { id: "busKmWeekly", kind: "number", default: 0 },
  { id: "railKmWeekly", kind: "number", default: 0 },
  { id: "shortFlights", kind: "number", default: 0 },
  { id: "longFlights", kind: "number", default: 0 },
  { id: "elecKwhMonthly", kind: "number", default: 300 },
  { id: "renewablePct", kind: "number", default: 0 },
  { id: "gasKwhMonthly", kind: "number", default: 200 },
  { id: "householdSize", kind: "number", default: 2 },
  { id: "diet", kind: "select", default: "average" },
  { id: "country", kind: "select", default: "" },
];

const STORAGE_KEY = "carbon-calculator-inputs-v1";

const CATEGORY_COLOR = { travel: "#0a97d9", home: "#fcc30b", diet: "#3f7e44" };
const CATEGORY_LABEL = { travel: "Travel", home: "Home", diet: "Diet" };

let countryData = {};

function readInputs() {
  const values = {};
  for (const field of FIELDS) {
    const el = document.getElementById(field.id);
    if (!el) continue;
    values[field.id] = field.kind === "number" ? Number(el.value) || 0 : el.value;
  }
  return values;
}

function writeInputs(values) {
  for (const field of FIELDS) {
    const el = document.getElementById(field.id);
    if (!el || !(field.id in values)) continue;
    el.value = values[field.id];
  }
  document.getElementById("renewablePctLabel").textContent = `${values.renewablePct ?? 0}%`;
}

function calculate(v) {
  const carKg = FACTORS.car[v.carType] * v.carKmWeekly * 52;
  const busKg = FACTORS.bus * v.busKmWeekly * 52;
  const railKg = FACTORS.rail * v.railKmWeekly * 52;
  const flightsKg =
    v.shortFlights * FACTORS.flightShortRoundTripKm * FACTORS.flightShortPerKm +
    v.longFlights * FACTORS.flightLongRoundTripKm * FACTORS.flightLongPerKm;
  const travelKg = carKg + busKg + railKg + flightsKg;

  const elecKg = v.elecKwhMonthly * 12 * FACTORS.electricityPerKwh * (1 - v.renewablePct / 100);
  const gasKg = v.gasKwhMonthly * 12 * FACTORS.gasPerKwh;
  const householdSize = Math.max(1, v.householdSize);
  const homeKg = (elecKg + gasKg) / householdSize;

  const dietKg = DIET_FOOTPRINT_KG[v.diet] ?? DIET_FOOTPRINT_KG.average;

  return {
    travel: travelKg,
    home: homeKg,
    diet: dietKg,
    total: travelKg + homeKg + dietKg,
  };
}

function fmtTonnes(kg) {
  return (kg / 1000).toFixed(1);
}

function renderBreakdown(results) {
  const el = document.getElementById("breakdown");
  const max = Math.max(results.travel, results.home, results.diet, 1);
  el.innerHTML = ["travel", "home", "diet"]
    .map((key) => {
      const pct = Math.max(2, (results[key] / max) * 100);
      return `
        <div class="breakdown-row">
          <span class="breakdown-label">${CATEGORY_LABEL[key]}</span>
          <span class="breakdown-track"><span class="breakdown-fill" style="width:${pct}%;background:${CATEGORY_COLOR[key]}"></span></span>
          <span class="breakdown-value">${fmtTonnes(results[key])} t</span>
        </div>`;
    })
    .join("");
}

function renderCompare(results, countryIso3) {
  const totalT = results.total / 1000;
  const country = countryData[countryIso3];

  const rows = [
    { label: "You", value: totalT, color: "#56c02b" },
    { label: REFERENCE.target2030.label, value: REFERENCE.target2030.value, color: "#8c98ad" },
    { label: REFERENCE.globalAvg.label, value: REFERENCE.globalAvg.value, color: "#8c98ad" },
  ];
  if (country) {
    rows.push({ label: `${country.name} avg (all sectors)`, value: country.value, color: "#0a97d9" });
  }

  const max = Math.max(...rows.map((r) => r.value), 1) * 1.1;
  const bars = document.getElementById("compare-bars");
  bars.innerHTML = rows
    .map(
      (r) => `
      <div class="compare-row">
        <span class="compare-label">${r.label}</span>
        <span class="compare-track"><span class="compare-fill" style="width:${(r.value / max) * 100}%;background:${r.color}"></span></span>
        <span class="compare-value">${r.value.toFixed(1)} t</span>
      </div>`
    )
    .join("");

  const caveat = document.getElementById("compare-caveat");
  if (caveat) caveat.remove();
  const note = document.createElement("div");
  note.className = "compare-caveat";
  note.id = "compare-caveat";
  note.textContent = country
    ? `${country.name}'s figure (${country.year}) is a national per-capita average across ALL sectors — industry, transport, government, everything — not just personal lifestyle choices, so it isn't a perfect apples-to-apples comparison.`
    : "Pick a country above to add a national comparison.";
  document.getElementById("compare").appendChild(note);
}

const TIPS = {
  travel: [
    "Combine short car trips, or switch a few to walking/cycling — most fuel is wasted on short cold-start trips.",
    "If you drive a medium/large petrol car often, an EV or hybrid can cut this category by half or more (impact depends on your electricity mix).",
    "Swap one short-haul flight a year for rail where a reasonable route exists — short flights are disproportionately carbon-intensive per km.",
  ],
  home: [
    "Ask your utility about a renewable energy tariff — the 'share from renewables' slider shows how much that alone would cut this category.",
    "Draught-proofing and lowering the thermostat by 1–2°C typically cuts heating use by 5–10% for minimal cost.",
    "If your gas heating use is high, a heat pump can cut this category substantially over time, though the upfront cost is real.",
  ],
  diet: [
    "Cutting red meat to a few times a week (rather than daily) is one of the single biggest per-meal changes most people can make.",
    "Shifting a few meat meals a week to plant-based alternatives adds up faster than most people expect.",
    "Food waste counts too — the emissions from producing food that's thrown out are 'wasted' twice.",
  ],
};

function renderTips(results) {
  const list = document.getElementById("tips-list");
  const sorted = Object.entries(results)
    .filter(([k]) => k !== "total")
    .sort((a, b) => b[1] - a[1]);
  const [topKey] = sorted[0];

  const items = [`Your biggest category is <strong>${CATEGORY_LABEL[topKey]}</strong> — that's the highest-leverage place to start.`, ...TIPS[topKey]];
  list.innerHTML = items.map((t) => `<li>${t}</li>`).join("");
}

function recalculate() {
  const values = readInputs();
  document.getElementById("renewablePctLabel").textContent = `${values.renewablePct}%`;

  const results = calculate(values);
  document.getElementById("total-value").textContent = fmtTonnes(results.total);
  renderBreakdown(results);
  renderCompare(results, values.country);
  renderTips(results);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

function populateCountrySelect() {
  const select = document.getElementById("country");
  const entries = Object.entries(countryData).sort((a, b) => a[1].name.localeCompare(b[1].name));
  select.innerHTML =
    `<option value="">(none)</option>` +
    entries.map(([iso3, c]) => `<option value="${iso3}">${c.name}</option>`).join("");
}

function loadSavedInputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function resetForm() {
  const defaults = {};
  for (const field of FIELDS) defaults[field.id] = field.default;
  writeInputs(defaults);
  localStorage.removeItem(STORAGE_KEY);
  recalculate();
}

async function init() {
  countryData = await fetch("data/co2-per-capita.json").then((r) => r.json());
  populateCountrySelect();

  const saved = loadSavedInputs();
  if (saved) writeInputs(saved);

  document.getElementById("calc-form").addEventListener("input", recalculate);
  document.getElementById("reset-btn").addEventListener("click", resetForm);

  recalculate();
}

init().catch((err) => {
  console.error(err);
  document.getElementById("results").innerHTML = `<p style="color:#e5243b">Failed to load comparison data. See console for details.</p>`;
});
