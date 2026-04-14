# Water Sector Presentation - Spring Meetings 2026

## Project Overview
Interactive presentation for ministers and policymakers at the World Bank Spring Meetings 2026. Built with Quarto revealjs, D3.js animated/morphing charts, and flubber for SVG path interpolation. Deployed to GitHub Pages.

## Tech Stack
- **Quarto** revealjs for presentation framework (1920x1080, fade transitions)
- **D3.js v7** for choropleth maps, line charts, bar charts, bubble charts
- **Flubber v0.4.2** for SVG path morphing (map-to-chart animations)
- **TopoJSON** for world map geometry (`data/world.json`)
- **Python** (pandas, geopandas) for data preparation
- No server-side dependencies -- pure static HTML

## Color Palette (from Color.docx)
- **Primary**: Maroon `#8B1A2D`, Navy `#1A3A5C`
- **Secondary**: Medium Blue `#2E6DA4`, Light Blue `#6699CC`, Dusty Rose `#B85C70`, Pale Rose `#D4909E`
- **Background**: `#F8F5F0`
- **Non-selection**: `#C8D8E4`, Ice Blue `#D8E8F0`
- **Opposite/hover**: `#8DA8BE`, `#A5BDD6`, `#C9A0A8`, `#E8B4C0`
- **No Data (maps)**: Gray `#D0D0D0`
- **Fonts**: Playfair Display (titles), Nunito (body)

## Official WBG Regions
Use official World Bank Group region names (not abbreviations with "&"):
- Sub-Saharan Africa (SSA)
- East Asia and Pacific (EAP)
- Europe and Central Asia (ECA)
- Latin America and the Caribbean (LAC)
- Middle East, North Africa, Afghanistan and Pakistan (MENAAP) -- NOT "MENA"
- South Asia (SAR)
- North America (used in TB data only)

## Data Sources
- **Tariff trends (PPP)**: Built from IBNET portal country-level utility data, PPP-adjusted using World Bank PA.NUS.PPP and PA.NUS.FCRF indicators. 3-year rolling median smoothing. Data from 2016+. Iran excluded from MENAAP (subsidized tariffs distort median).
- **Tariff trends (nominal)**: From `ibnet-tariff-portal/web/public/data/timeseries.json` (pre-computed, constant 2025 USD), 3-year rolling median smoothed.
- **PPP conversion factors**: `data/ppp_price_levels.json` (fetched from World Bank API, 201 countries, 2010-2024)
- **NRW**: Combined from `regulators_performance_database` (SSA, LAC) and old IBNET export (EAP, ECA, MENAAP, SAR). Old IBNET has 29,475 NRW-calculable rows from 141 countries after fixing comma-separated number parsing.
- **Metering, cost coverage**: `regulators_performance_database/utility_data/combined/observations.csv`
- **Triple Burden**: `Policies Tariff and Subsidy Reform WFP/2_TB/Data/proc/` (April 12 dataset). Water = poverty + drought risk + low water access. Sanitation = poverty + flood risk + low sanitation access.
- **NRW bubble populations**: World Bank 2024 estimates (SAR 2.0B, EAP 2.3B, SSA 1.2B, ECA 0.9B, LAC 0.7B, MENAAP 0.5B)
- **External**: WB Triple Burden doc, FWSF spending data, Continental Drying report, JMP 2025 report

## Key Conventions
- All JSON data files go in `data/`
- JS chart modules go in `scripts/`
- Python data prep scripts go in `scripts-data/`
- Rendered output goes to `docs/` (GitHub Pages)
- Mirror all data/script changes to `docs/` before rendering
- Use median-of-medians (country median first, then regional) for tariff trends to prevent large-country domination
- Use 3-year rolling median to smooth composition effects in tariff data
- Chart font sizes: 36px titles, 20px axes/notes, 18px labels (to match iframe scale)
- Design style: OWID + Economist (Playfair Display + Nunito, horizontal gridlines only, no axis domain lines)
- Source citations: single line, `white-space: nowrap`
- Cache-busting: append `?v=N` to script/data fetch URLs when updating

## Data Quality Fixes Applied
- **NRW decimal rescue**: Values in (0,1) range multiplied by 100 (533 values rescued)
- **NRW comma fix**: Old IBNET export had comma-separated numbers ("57,237,112.48") -- fixed by stripping commas before float parsing, recovering 29,475 rows
- **Tariff cleanup**: Removed years >2024, entries with <5 observations, medians <$0.50
- **Iran exclusion**: Removed from PPP tariff calculation (heavily subsidized $0.01 tariffs dominate MENAAP median)
- **MENA tariff (nominal)**: Filtered $0.16 currency conversion errors
- **TB map globe outline**: Hidden with background-colored sphere stroke overlay
- **Iframe border cover**: JS-injected div covers external iframe top border

## Chart Modules
- `scripts/hero-chart.js` -- Tariff renderer (nominal), NRW bubble chart, affordability paired bars, metering bars, cost coverage lollipop, paradox dual-axis
- `scripts/tb-chart.js` -- Triple Burden ADM2 choropleth maps + regional bar charts
- `scripts/coverage-map.js` -- D3 choropleth for coverage slide
- `scripts/cd-chart.js` -- Continental Drying charts (electricity/TWS relationship)
- `scripts/cd-map.js` -- Continental Drying raster map (GRACE satellite data, canvas renderer, container-relative sizing)
- `scripts/main.js` -- Counter animations, slide event dispatch, fragment listeners

## Key Animations
- **Tariff charts**: Regional lines draw slowly (2s, 200ms stagger), fade to 30% on arrow click, bold navy World Average draws in (fragment-triggered)
- **TB Venn**: Circles converge slowly (2.5s each), centered on slide (no slide-left/explainer)
- **NRW bubbles**: 1.8s per bubble, 600ms stagger, eased cubic-out
- **Continental Drying map**: Renders immediately on slide entry (no book animation, no mega-region outlines)

## Slide Order (15 slides)
1. Title (cover with WBG Water + GWSP logos bottom-right)
2. Water Forward (placeholder)
3. Continental Drying Map (GRACE satellite raster, book cover thumbnail)
4. Water Crisis Scale (JMP 2025 data, dark background)
5. Triple Burden Concept (Venn diagram, centered)
6. Triple Burden Water Map (ADM2 choropleth — poverty, droughts, water)
7. Triple Burden Sanitation Map (ADM2 choropleth — poverty, floods, sanitation)
8. Spending Gap (external iframe)
9. Budget Execution (external iframe)
10. Tariffs Nominal (line chart with World Average fragment)
11. NRW Efficiency (bubble chart, population-sized)
12. Affordability (paired bar chart GDP vs B20)
13. Agricultural Water Pricing (stats left + energy pricing chart right)
14. Policy Recommendations (two-column left-border callouts)
15. Thank You (with WBG Water + GWSP logos bottom-right)

## Data Preparation Scripts
- `scripts-data/prepare_tb_data.py` -- Converts TB CSVs to `data/tb_data_countries.json`
- `scripts-data/prepare_tb_geo.py` -- Converts GAD_ADM2 shapefile to dissolved GeoJSON. Requires geopandas.
- Continental drying raster grid extracted via rasterio from GRACE TIFF (step=2 downsampling)
- PPP tariff processing uses World Bank PA.NUS.PPP / PA.NUS.FCRF conversion factors
- Affordability data extracted from IBNET portal countries.json (affordGdp vs affordB20)

## Rendering
```bash
quarto render presentation.qmd
```
Output lands in `docs/`. Open `docs/presentation.html` to view.

## Local Preview
```bash
cd docs && python3 -m http.server 8765
```
Then open `http://localhost:8765/presentation.html`.
