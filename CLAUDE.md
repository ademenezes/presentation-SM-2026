# Water Sector Presentation - Spring Meetings 2026

## Project Overview
Interactive presentation for ministers and policymakers at the World Bank Spring Meetings 2026. Built with Quarto revealjs, D3.js animated/morphing charts, and flubber for SVG path interpolation. Deployed to GitHub Pages.

## Tech Stack
- **Quarto** revealjs for presentation framework (1920x1080, fade transitions)
- **D3.js v7** for choropleth maps, line charts, bar charts, bubble charts
- **Flubber v0.4.2** for SVG path morphing (map-to-chart animations)
- **TopoJSON** for world map geometry (`data/world.json`)
- **Python** (pandas, openpyxl) for data preparation only
- No server-side dependencies -- pure static HTML

## Data Sources
- **Tariff trends**: `ibnet-tariff-portal/web/public/data/timeseries.json` (pre-computed, constant 2025 USD)
- **NRW, metering, cost coverage**: `regulators_performance_database/utility_data/combined/observations.csv`
- **IBNET backup**: `databases_ibnet_gwi/old_IBNET_Export_RawData_20230310(Export) (1).csv`
- **Region mapping**: from IBNET tariff export (AFR2, EAP, ECA, LAC, MNA, SAR)
- **Triple Burden**: `2_TB/` directory (ADM2-level poverty, flood risk, water/sanitation access)
- **External**: WB Triple Burden doc, FWSF spending data, Continental Drying report

## Key Conventions
- All JSON data files go in `data/`
- JS chart modules go in `scripts/`
- Python data prep scripts go in `scripts-data/`
- Rendered output goes to `docs/` (GitHub Pages)
- Use median-of-medians (country median first, then regional) to prevent large-country domination
- 6-region IBNET classification: Africa, East Asia & Pacific, Europe & Central Asia, Latin America, MENA, South Asia
- Design style: OWID + Economist (system fonts, horizontal gridlines only, no axis domain lines)

## Data Quality Fixes Applied
- **NRW decimal rescue**: Values in (0,1) range multiplied by 100 (533 values rescued)
- **Tariff cleanup**: Removed years >2024, entries with <5 observations, medians <$0.50
- **MENA tariff**: Filtered $0.16 currency conversion errors
- **Region key mapping**: IBNET codes (AFR2, EAP, etc.) mapped to full WB region names
- **Antimeridian fix**: SVG clipPath on sphere projection for countries spanning 180° longitude

## Chart Modules
- `scripts/hero-chart.js` -- Multi-state chart for tariff, NRW, metering, cost coverage slides
- `scripts/tb-chart.js` -- Triple Burden map-to-chart morph using flubber (choropleth → stacked bars)
- `scripts/coverage-map.js` -- D3 choropleth for coverage slide

## Triple Burden Morph
The TB slides use a flubber-based animation where D3 choropleth country shapes morph into horizontal stacked bar segments. Each country collapses into its (region, segment) target rectangle. Triggered by Reveal.js fragment events. Clean overlay bars fade in after morph completes.

## Rendering
```bash
quarto render presentation.qmd
```
Output lands in `docs/`. Open `docs/presentation.html` to view.

## Local Preview
```bash
ruby serve.rb
# or
cd docs && python3 -m http.server 8765
```
Then open `http://localhost:8765/presentation.html`.
