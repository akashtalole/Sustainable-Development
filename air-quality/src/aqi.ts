/**
 * US EPA Air Quality Index categories, breakpoints, colors, and health
 * guidance — the standard scale used by most public air-quality tools.
 * https://www.airnow.gov/aqi/aqi-basics/
 */
export interface AqiCategory {
  key: string;
  label: string;
  max: number; // upper bound of this category (inclusive); last one is Infinity
  color: string;
  textColor: string; // legible text color against `color`
  guidance: string;
}

export const AQI_CATEGORIES: AqiCategory[] = [
  { key: "good", label: "Good", max: 50, color: "#00e400", textColor: "#0b0f16", guidance: "Air quality is satisfactory, and air pollution poses little or no risk." },
  { key: "moderate", label: "Moderate", max: 100, color: "#ffff00", textColor: "#0b0f16", guidance: "Acceptable; a risk for an unusually sensitive few." },
  { key: "usg", label: "Unhealthy for Sensitive Groups", max: 150, color: "#ff7e00", textColor: "#0b0f16", guidance: "Sensitive groups (kids, elderly, respiratory/heart conditions) may experience effects." },
  { key: "unhealthy", label: "Unhealthy", max: 200, color: "#ff0000", textColor: "#ffffff", guidance: "Everyone may begin to experience effects; sensitive groups more seriously." },
  { key: "very-unhealthy", label: "Very Unhealthy", max: 300, color: "#8f3f97", textColor: "#ffffff", guidance: "Health alert: everyone may experience more serious effects." },
  { key: "hazardous", label: "Hazardous", max: Infinity, color: "#7e0023", textColor: "#ffffff", guidance: "Health warning of emergency conditions — the entire population is likely affected." },
];

export function categoryForAqi(aqi: number): AqiCategory {
  return AQI_CATEGORIES.find((c) => aqi <= c.max) ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

/** "Alarm" severity: stations at Unhealthy or worse — mirrors an IoT platform's alarm threshold concept. */
export function isAlarm(aqi: number): boolean {
  return aqi > 150;
}
