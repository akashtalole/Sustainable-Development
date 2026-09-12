/**
 * SDG indicator layer catalog.
 *
 * Mirrors the "map layer catalog" pattern used by worldmonitor.app
 * (github.com/koala73/worldmonitor): every layer is a self-describing
 * entry — id, title, data source, unit, and "direction" (whether a
 * higher or lower value represents progress) — so the map and the
 * legend can render any layer generically without per-layer UI code.
 *
 * Values come from the World Bank Indicators API (public, no key
 * required), refreshed via scripts/fetch_indicators.py. Each entry is
 * a reasonable, commonly-cited proxy for its SDG — not the official
 * UN Global SDG Indicator for that goal, since several official
 * indicators (e.g. SDG 12, SDG 14) have too little country coverage
 * in the World Bank API to render a useful world map.
 */

export type Direction = "higher-is-better" | "lower-is-better" | "context";

export interface SdgLayer {
  goal: number;
  code: string; // World Bank indicator code
  title: string;
  shortTitle: string;
  unit: string;
  direction: Direction;
  color: string; // official UN SDG color for this goal
  source: string;
  sourceUrl: string;
}

// Official UN SDG colors (goal 1-17)
export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A",
};

export const LAYERS: SdgLayer[] = [
  {
    goal: 1,
    code: "SI.POV.DDAY",
    title: "Poverty headcount ratio at $3.00/day (2021 PPP)",
    shortTitle: "No Poverty",
    unit: "% of population",
    direction: "lower-is-better",
    color: SDG_COLORS[1],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SI.POV.DDAY",
  },
  {
    goal: 2,
    code: "SN.ITK.DEFC.ZS",
    title: "Prevalence of undernourishment",
    shortTitle: "Zero Hunger",
    unit: "% of population",
    direction: "lower-is-better",
    color: SDG_COLORS[2],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SN.ITK.DEFC.ZS",
  },
  {
    goal: 3,
    code: "SH.STA.MMRT",
    title: "Maternal mortality ratio",
    shortTitle: "Good Health",
    unit: "per 100,000 live births",
    direction: "lower-is-better",
    color: SDG_COLORS[3],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SH.STA.MMRT",
  },
  {
    goal: 4,
    code: "SE.ADT.LITR.ZS",
    title: "Adult literacy rate",
    shortTitle: "Quality Education",
    unit: "% of people ages 15+",
    direction: "higher-is-better",
    color: SDG_COLORS[4],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SE.ADT.LITR.ZS",
  },
  {
    goal: 5,
    code: "SG.GEN.PARL.ZS",
    title: "Seats held by women in national parliament",
    shortTitle: "Gender Equality",
    unit: "% of seats",
    direction: "higher-is-better",
    color: SDG_COLORS[5],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SG.GEN.PARL.ZS",
  },
  {
    goal: 6,
    code: "SH.H2O.BASW.ZS",
    title: "People using at least basic drinking water services",
    shortTitle: "Clean Water",
    unit: "% of population",
    direction: "higher-is-better",
    color: SDG_COLORS[6],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SH.H2O.BASW.ZS",
  },
  {
    goal: 7,
    code: "EG.ELC.ACCS.ZS",
    title: "Access to electricity",
    shortTitle: "Clean Energy",
    unit: "% of population",
    direction: "higher-is-better",
    color: SDG_COLORS[7],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS",
  },
  {
    goal: 8,
    code: "SL.UEM.TOTL.ZS",
    title: "Unemployment rate",
    shortTitle: "Decent Work",
    unit: "% of labor force",
    direction: "lower-is-better",
    color: SDG_COLORS[8],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS",
  },
  {
    goal: 9,
    code: "IT.NET.USER.ZS",
    title: "Individuals using the Internet",
    shortTitle: "Industry & Innovation",
    unit: "% of population",
    direction: "higher-is-better",
    color: SDG_COLORS[9],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/IT.NET.USER.ZS",
  },
  {
    goal: 10,
    code: "SI.POV.GINI",
    title: "GINI index of income inequality",
    shortTitle: "Reduced Inequalities",
    unit: "index (0–100)",
    direction: "lower-is-better",
    color: SDG_COLORS[10],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/SI.POV.GINI",
  },
  {
    goal: 11,
    code: "EN.POP.SLUM.UR.ZS",
    title: "Population living in slums",
    shortTitle: "Sustainable Cities",
    unit: "% of urban population",
    direction: "lower-is-better",
    color: SDG_COLORS[11],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/EN.POP.SLUM.UR.ZS",
  },
  {
    goal: 12,
    code: "EN.ATM.PM25.MC.M3",
    title: "PM2.5 air pollution, mean annual exposure",
    shortTitle: "Responsible Consumption",
    unit: "µg/m³",
    direction: "lower-is-better",
    color: SDG_COLORS[12],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/EN.ATM.PM25.MC.M3",
  },
  {
    goal: 13,
    code: "EN.GHG.CO2.PC.CE.AR5",
    title: "CO2 emissions per capita (excl. LULUCF)",
    shortTitle: "Climate Action",
    unit: "t CO2e / capita",
    direction: "lower-is-better",
    color: SDG_COLORS[13],
    source: "World Bank / Climate Watch",
    sourceUrl: "https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5",
  },
  {
    goal: 14,
    code: "ER.MRN.PTMR.ZS",
    title: "Marine protected areas",
    shortTitle: "Life Below Water",
    unit: "% of territorial waters",
    direction: "higher-is-better",
    color: SDG_COLORS[14],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/ER.MRN.PTMR.ZS",
  },
  {
    goal: 15,
    code: "AG.LND.FRST.ZS",
    title: "Forest area",
    shortTitle: "Life on Land",
    unit: "% of land area",
    direction: "higher-is-better",
    color: SDG_COLORS[15],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/AG.LND.FRST.ZS",
  },
  {
    goal: 16,
    code: "VC.IHR.PSRC.P5",
    title: "Intentional homicides",
    shortTitle: "Peace & Justice",
    unit: "per 100,000 people",
    direction: "lower-is-better",
    color: SDG_COLORS[16],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/VC.IHR.PSRC.P5",
  },
  {
    goal: 17,
    code: "DT.ODA.ODAT.GN.ZS",
    title: "Net ODA received",
    shortTitle: "Partnerships",
    unit: "% of GNI",
    direction: "context",
    color: SDG_COLORS[17],
    source: "World Bank",
    sourceUrl: "https://data.worldbank.org/indicator/DT.ODA.ODAT.GN.ZS",
  },
];

export function layerByGoal(goal: number): SdgLayer {
  const layer = LAYERS.find((l) => l.goal === goal);
  if (!layer) throw new Error(`No layer for goal ${goal}`);
  return layer;
}
