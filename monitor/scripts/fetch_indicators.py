#!/usr/bin/env python3
"""Refresh public/data/indicators.json from the World Bank Indicators API.

Pulls a multi-year history (not just the latest value) per indicator per
country, so the app can show trend sparklines and up/down arrows, not just
a single snapshot. No API key required.

Run with: python3 scripts/fetch_indicators.py (from the monitor/ directory),
then re-build the app.
"""
import json
import urllib.request
import time
from pathlib import Path

OUT = Path(__file__).parent.parent / "public" / "data" / "indicators.json"

YEAR_FROM = 2004
YEAR_TO = 2025

# Keep this in sync with the `code` fields in src/layers.ts
INDICATOR_CODES = [
    "SI.POV.DDAY",
    "SN.ITK.DEFC.ZS",
    "SH.STA.MMRT",
    "SE.ADT.LITR.ZS",
    "SG.GEN.PARL.ZS",
    "SH.H2O.BASW.ZS",
    "EG.ELC.ACCS.ZS",
    "SL.UEM.TOTL.ZS",
    "IT.NET.USER.ZS",
    "SI.POV.GINI",
    "EN.POP.SLUM.UR.ZS",
    "EN.ATM.PM25.MC.M3",
    "EN.GHG.CO2.PC.CE.AR5",
    "ER.MRN.PTMR.ZS",
    "AG.LND.FRST.ZS",
    "VC.IHR.PSRC.P5",
    "DT.ODA.ODAT.GN.ZS",
]


def get(url: str, retries: int = 4):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return json.load(r)
        except Exception as exc:  # noqa: BLE001 - best-effort retry loop
            print(f"retry {attempt + 1}/{retries} for {url}: {exc}")
            time.sleep(3)
    raise RuntimeError(f"Failed to fetch {url}")


def fetch_valid_country_codes() -> set[str]:
    """World Bank's /country list includes region aggregates (e.g. 'World',
    'East Asia & Pacific'); real countries have a non-'NA' region id."""
    countries = get("https://api.worldbank.org/v2/country?format=json&per_page=400")[1]
    return {c["id"] for c in countries if c["region"]["id"] != "NA"}


def fetch_indicator_series(code: str, valid: set[str]) -> dict:
    """Returns {iso3: [[year, value], ...]} sorted ascending by year."""
    url = (
        f"https://api.worldbank.org/v2/country/all/indicator/{code}"
        f"?format=json&per_page=20000&date={YEAR_FROM}:{YEAR_TO}"
    )
    data = get(url)
    rows = data[1] if len(data) > 1 and data[1] else []
    by_country: dict[str, list[list[float]]] = {}
    for row in rows:
        iso3 = row.get("countryiso3code")
        val = row.get("value")
        if iso3 in valid and val is not None:
            by_country.setdefault(iso3, []).append([int(row["date"]), round(val, 3)])
    for series in by_country.values():
        series.sort(key=lambda p: p[0])
    return by_country


def main() -> None:
    valid = fetch_valid_country_codes()
    print(f"{len(valid)} recognized countries")

    out = {}
    for code in INDICATOR_CODES:
        series = fetch_indicator_series(code, valid)
        out[code] = series
        points = sum(len(v) for v in series.values())
        print(f"{code}: {len(series)} countries, {points} data points")

    OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
