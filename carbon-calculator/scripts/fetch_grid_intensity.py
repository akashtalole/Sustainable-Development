#!/usr/bin/env python3
"""Refresh data/grid-intensity.json — per-country electricity grid carbon
intensity, from Our World in Data's Ember-sourced dataset. No API key
required.

Run with: python3 scripts/fetch_grid_intensity.py (from the
carbon-calculator/ directory).
"""
import csv
import io
import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent.parent / "data" / "grid-intensity.json"
URL = "https://ourworldindata.org/grapher/carbon-intensity-electricity.csv?v=1&csvType=full&useColumnShortNames=true"


def main() -> None:
    req = urllib.request.Request(URL, headers={"User-Agent": "sdg-carbon-calculator/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        text = r.read().decode("utf-8")

    rows = csv.DictReader(io.StringIO(text))
    latest: dict[str, tuple[int, float, str]] = {}
    for row in rows:
        code = row["code"].strip()
        # Empty code = regional/income-group aggregate; OWID_* = OWID's own
        # pseudo-codes for aggregates (e.g. OWID_WRL for World) — neither is
        # a selectable country here.
        if not code or code.startswith("OWID_"):
            continue
        value = row["co2_intensity__gco2_kwh"]
        if value in ("", None):
            continue
        year = int(row["year"])
        if code not in latest or year > latest[code][0]:
            latest[code] = (year, float(value), row["entity"])

    out = {code: {"name": name, "gPerKwh": round(value, 1), "year": year} for code, (year, value, name) in latest.items()}

    print(f"{len(out)} countries")
    OUT.write_text(json.dumps(out, separators=(",", ":"), sort_keys=True))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
