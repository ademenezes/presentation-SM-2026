# Session Log

## 2026-04-03 - Project Inception

### Decisions Made
- **Format**: Quarto revealjs with broadcast-style "data wall" design (not PowerPoint)
- **Narrative arc**: Challenge -> Evidence -> Bright Spots + Gaps -> Urgency (nexus) -> Opportunity
- **Title**: "Water Services in Transition: From Crisis to Smart Investment"
- **Key design element**: D3.js hero morphing chart that transforms across 4 scenes (tariffs -> NRW -> metering -> cost coverage)
- **Deployment**: GitHub Pages from `docs/` folder
- **Tariff data**: Use pre-computed timeseries.json from ibnet-tariff-portal (already deflated to constant 2025 USD)
- **Aggregation method**: Median-of-medians (country median first) to prevent Brazil/France domination

### Data Sources Identified
- ibnet-tariff-portal: tariff timeseries (ready to use)
- regulators_performance_database: NRW, metering, cost coverage (3M+ observations, 32 countries)
- databases_ibnet_gwi: IBNET backup data (33K records, 152 countries)
- WB publications: Triple Burden, FWSF, Continental Drying

### Storyline (13 scenes, 15 min)
1. Title
2-3. Triple burden maps (water, sanitation)
4-5. Spending trend + gap
6. Data coverage map
7-10. Hero morphing chart (tariffs -> NRW -> metering -> cost coverage)
11-12. Continental drying (land use + energy vs TWS)
13. Call to action
