"""Shared utilities for data preparation: region mapping, CPI deflation, JSON helpers."""

import json
import numpy as np
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PORTAL_DATA = Path("/Users/anademenezes/Documents/ibnet-tariff-portal/web/public/data")
REG_DB = Path("/Users/anademenezes/Documents/regulators_performance_database/utility_data")
IBNET_GWI = Path("/Users/anademenezes/Documents/databases_ibnet_gwi")

# ── IBNET non-standard country code mapping ───────────────────────────────
IBNET_TO_ISO3 = {
    "URK": "UKR", "ROM": "ROU", "KSV": "XKX", "TMP": "TLS",
    "ZAR": "COD", "WBG": "PSE", "ADO": "AND", "BRU": "BRN",
}

# ── Official WB Region names (from WB API) ───────────────────────────────
# Note: WB API returns trailing spaces on some region names -- we strip them
REGION_NAMES = [
    "East Asia & Pacific",
    "Europe & Central Asia",
    "Latin America & Caribbean",
    "Middle East, North Africa, Afghanistan & Pakistan",
    "North America",
    "South Asia",
    "Sub-Saharan Africa",
]

# Short labels for charts
REGION_SHORT = {
    "Europe & Central Asia": "ECA",
    "Sub-Saharan Africa": "SSA",
    "Latin America & Caribbean": "LAC",
    "East Asia & Pacific": "EAP",
    "South Asia": "SAR",
    "Middle East, North Africa, Afghanistan & Pakistan": "MENAP",
    "North America": "NAM",
}

# Chart colors per region (consistent across all visualizations)
REGION_COLORS = {
    "Sub-Saharan Africa": "#FF6B35",
    "East Asia & Pacific": "#00B4D8",
    "Europe & Central Asia": "#7209B7",
    "Latin America & Caribbean": "#2EC4B6",
    "Middle East, North Africa, Afghanistan & Pakistan": "#FFD166",
    "South Asia": "#EF476F",
    "North America": "#AAAAAA",
}

# Mapping from old IBNET/portal region codes to official WB region names
IBNET_TO_WB_REGION = {
    "AFR2": "Sub-Saharan Africa",
    "EAP": "East Asia & Pacific",
    "ECA": "Europe & Central Asia",
    "LAC": "Latin America & Caribbean",
    "MNA": "Middle East, North Africa, Afghanistan & Pakistan",
    "SAR": "South Asia",
}

def load_country_region_mapping():
    """Load iso3 -> region name mapping from official WB classification."""
    wb_path = DATA_DIR / "wb_country_regions.json"
    with open(wb_path) as f:
        raw = json.load(f)
    # Strip trailing spaces from region names (WB API quirk)
    return {k: v.strip() for k, v in raw.items()}


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return None if np.isnan(obj) else round(float(obj), 4)
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return super().default(obj)


def write_json(data, path):
    """Write JSON with compact formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, cls=NpEncoder, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"  {path.name}: {size_kb:.0f} KB")
