"""
Prepare Continental Drying data for presentation.
Converts three source CSVs into JSON files in data/ and docs/data/.
"""
import csv
import json
import os
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CD_DIR = os.path.join(BASE, "1_CD", "1_CD")
OUT_DIRS = [os.path.join(BASE, "data"), os.path.join(BASE, "docs", "data")]


def write_json(filename, data):
    for d in OUT_DIRS:
        path = os.path.join(d, filename)
        with open(path, "w") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"  wrote {path} ({len(data)} records)")


def prepare_freshwater_loss():
    """Convert global TWS time series. Invert values so loss is positive."""
    src = os.path.join(CD_DIR, "1_ContDrying", "Data", "proc", "global_tws_km3_yr.csv")
    rows = []
    with open(src, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw = row["Land (km3/yr)"].strip()
            if not raw:
                loss = None
            else:
                loss = round(-float(raw), 1)
            dt = datetime.strptime(row["time"].strip(), "%m/%d/%y")
            rows.append({"time": dt.strftime("%Y-%m-%d"), "loss": loss})
    write_json("cd_freshwater_loss.json", rows)


def prepare_land_use():
    """Convert land use coefficients with CIs."""
    src = os.path.join(CD_DIR, "2_LandUse", "Data", "proc", "DataForFigure_LandType.csv")
    rows = []
    with open(src) as f:
        reader = csv.DictReader(f)
        for row in reader:
            v = row["Variable"].strip()
            if not v:
                continue
            coeff = round(float(row["Coeff"]), 4)
            ci_l = round(float(row["L95CI"]), 4) if row["L95CI"].strip() else None
            ci_u = round(float(row["U95CI"]), 4) if row["U95CI"].strip() else None
            rows.append({
                "variable": v,
                "coeff": coeff,
                "ci_lower": ci_l,
                "ci_upper": ci_u,
                "id": int(row["ID"]),
            })
    rows.sort(key=lambda r: r["id"])
    write_json("cd_land_use.json", rows)


def prepare_electricity_tws():
    """Convert smoothed electricity-TWS relationship."""
    src = os.path.join(CD_DIR, "3_Electricity", "Data", "proc", "DataForFigure_ElecTWS.csv")
    rows = []
    with open(src) as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({
                "x": round(float(row["x"]), 2),
                "y": round(float(row["y"]), 2),
                "ci_lower": round(float(row["y_ci_lower"]), 2),
                "ci_upper": round(float(row["y_ci_upper"]), 2),
            })
    write_json("cd_electricity_tws.json", rows)


if __name__ == "__main__":
    print("Preparing Continental Drying data...")
    prepare_freshwater_loss()
    prepare_land_use()
    prepare_electricity_tws()
    print("Done.")
