#!/usr/bin/env python3
"""Refresh data/co2-per-capita.json from the World Bank Indicators API.

Latest available per-capita CO2 (excl. LULUCF) by country, used as
reference context in the calculator. No API key required.

Run with: python3 scripts/fetch_co2_data.py (from the carbon-calculator/
directory).
"""
import json
import urllib.request
import time
from pathlib import Path

OUT = Path(__file__).parent.parent / "data" / "co2-per-capita.json"
INDICATOR_CODE = "EN.GHG.CO2.PC.CE.AR5"


def get(url: str, retries: int = 4):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return json.load(r)
        except Exception as exc:  # noqa: BLE001 - best-effort retry loop
            print(f"retry {attempt + 1}/{retries} for {url}: {exc}")
            time.sleep(3)
    raise RuntimeError(f"Failed to fetch {url}")


def fetch_valid_country_codes() -> dict:
    countries = get("https://api.worldbank.org/v2/country?format=json&per_page=400")[1]
    return {c["id"]: c["name"] for c in countries if c["region"]["id"] != "NA"}


def main() -> None:
    valid = fetch_valid_country_codes()
    url = (
        f"https://api.worldbank.org/v2/country/all/indicator/{INDICATOR_CODE}"
        "?format=json&per_page=20000&mrnev=1"  # most recent non-empty value
    )
    data = get(url)
    rows = data[1] if len(data) > 1 and data[1] else []

    out = {}
    for row in rows:
        iso3 = row.get("countryiso3code")
        val = row.get("value")
        if iso3 in valid and val is not None:
            out[iso3] = {"name": valid[iso3], "value": round(val, 2), "year": int(row["date"])}

    print(f"{len(out)} countries")
    OUT.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
