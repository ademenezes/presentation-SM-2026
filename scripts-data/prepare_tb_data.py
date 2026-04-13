"""
Regenerate TB country-level JSON from the April 12 dataset.
Reads TP_Wat_byISO3.csv and TP_San_byISO3.csv, produces data/tb_data_countries.json
matching the format expected by scripts/tb-chart.js.
"""

import csv
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "Policies Tariff and Subsidy Reform WFP", "2_TB", "Data", "proc")
OUT = os.path.join(BASE, "data", "tb_data_countries.json")

REG_MAP = {
    "SSA": "Sub-Saharan Africa",
    "SA": "South Asia",
    "EAP": "East Asia & Pacific",
    "LAC": "Latin America & Caribbean",
    "MENAAP": "Middle East, North Africa, Afghanistan & Pakistan",
    "ECA": "Europe & Central Asia",
    "NA": "North America",
    "NorthAm": "North America",
}


def parse_pct(val):
    """Parse percentage value, return rounded float."""
    try:
        v = float(val)
        return round(v, 1)
    except (ValueError, TypeError):
        return 0.0


def dominant_burden(noData, none, one, two, three):
    """Return the burden level with highest share (-9 for noData)."""
    vals = {-9: noData, 0: none, 1: one, 2: two, 3: three}
    return max(vals, key=vals.get)


def load_country_csv(path, suffix):
    """Load country CSV with columns sh_na_{s}, sh_0_{s}, etc."""
    countries = {}
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            iso3 = row["iso3"]
            reg = REG_MAP.get(row["reg1"], row["reg1"])
            nd = parse_pct(row[f"sh_na_{suffix}"])
            n0 = parse_pct(row[f"sh_0_{suffix}"])
            n1 = parse_pct(row[f"sh_1_{suffix}"])
            n2 = parse_pct(row[f"sh_2_{suffix}"])
            n3 = parse_pct(row[f"sh_3_{suffix}"])
            countries[iso3] = {
                "dominant": dominant_burden(nd, n0, n1, n2, n3),
                "three": n3,
                "two": n2,
                "one": n1,
                "none": n0,
                "noData": nd,
                "region": reg,
            }
    return countries


water = load_country_csv(os.path.join(SRC, "TP_Wat_byISO3.csv"), "w")
sanitation = load_country_csv(os.path.join(SRC, "TP_San_byISO3.csv"), "s")

# Build region summary from country data (population-weighted shares are in the regional CSVs,
# but the countries JSON also carries a regions block for the chart).
result = {"water": water, "sanitation": sanitation}

with open(OUT, "w") as f:
    json.dump(result, f, separators=(",", ":"))

print(f"Wrote {len(water)} water + {len(sanitation)} sanitation countries to {OUT}")
