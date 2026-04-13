"""
Convert updated GAD_ADM2 shapefile to dissolved GeoJSON for the TB choropleth maps.
Dissolves ADM2 polygons by (region, burden_level), producing compact GeoJSON files
matching the format expected by scripts/tb-chart.js.

Output: data/tb_adm2_water.json, data/tb_adm2_sanitation.json
"""

import geopandas as gpd
import json
import os
import warnings

warnings.filterwarnings("ignore")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHP = os.path.join(BASE, "Policies Tariff and Subsidy Reform WFP", "2_TB", "Shapefile", "GAD_ADM2.shp")

REG_CODE = {
    "SSA": "SSA", "SA": "SA", "EAP": "EAP",
    "LAC": "LAC", "MENAAP": "MENAAP", "ECA": "ECA",
    "NA": "NorthAm", "NorthAm": "NorthAm",
}


def make_geojson(gdf, burden_col, outpath):
    """Dissolve by (region, burden) and write compact GeoJSON."""
    # Map region codes
    gdf = gdf.copy()
    gdf["r"] = gdf["reg1"].map(REG_CODE).fillna(gdf["reg1"])
    gdf["b"] = gdf[burden_col].fillna(-9).astype(int)

    # Dissolve by (r, b)
    dissolved = gdf.dissolve(by=["r", "b"], as_index=False)[["r", "b", "geometry"]]

    # Simplify geometry aggressively (tolerance ~0.05 degrees ≈ 5km at equator)
    dissolved["geometry"] = dissolved["geometry"].simplify(0.05, preserve_topology=True)

    # Convert to GeoJSON dict with rounded coordinates
    def round_coords(coords, precision=3):
        """Recursively round coordinate arrays."""
        if isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        return [round_coords(c, precision) for c in coords]

    features = []
    feat_id = 0
    for idx, row in dissolved.iterrows():
        geom = row["geometry"].__geo_interface__
        # Round coordinates to 3 decimal places
        geom["coordinates"] = round_coords(geom["coordinates"])
        features.append({
            "id": str(feat_id),
            "type": "Feature",
            "properties": {"b": int(row["b"]), "r": row["r"]},
            "geometry": geom,
        })
        feat_id += 1

    geojson = {"type": "FeatureCollection", "features": features}

    with open(outpath, "w") as f:
        json.dump(geojson, f, separators=(",", ":"))

    size_mb = os.path.getsize(outpath) / 1024 / 1024
    print(f"  {outpath}: {len(features)} features, {size_mb:.1f} MB")


print("Reading shapefile...")
gdf = gpd.read_file(SHP)
print(f"  {len(gdf)} ADM2 polygons loaded")

print("Generating water GeoJSON...")
make_geojson(gdf, "tb_f_wb", os.path.join(BASE, "data", "tb_adm2_water.json"))

print("Generating sanitation GeoJSON...")
make_geojson(gdf, "tb_f_sb", os.path.join(BASE, "data", "tb_adm2_sanitation.json"))

print("Done!")
