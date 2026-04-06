# Water Services in Transition: From Crisis to Smart Investment

Interactive presentation for high-level policymakers on global water sector performance, financing gaps, and investment opportunities.

## Quick Start

```bash
# Install Quarto (macOS)
brew install --cask quarto

# Render the presentation
quarto render presentation.qmd

# Open in browser
open docs/presentation.html
```

## Project Structure

```
scripts/          # D3.js and Plotly chart modules
scripts-data/     # Python data preparation scripts
data/             # JSON data files for charts
references/       # Extracted images from WB publications
docs/             # Rendered output (GitHub Pages)
```

## Data Sources

| Slide | Data | Source |
|-------|------|--------|
| Triple burden maps | WB publication | [Document](https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099082025114522311) |
| Spending trends | FWSF | [Dashboard](https://fwsf.wbwaterdata.org/) |
| Data coverage map | IBNET + Regulators DB | Local databases |
| Tariff trends | IBNET Tariff Portal | Pre-computed timeseries.json |
| NRW, metering, cost coverage | Regulators Performance DB | 3M+ observations, 32 countries |
| Continental drying | WB Continental Drying | [Report](https://www.worldbank.org/en/publication/continental-drying-a-threat-to-our-common-future) |

## Deployment

Rendered output is in `docs/`. To deploy on GitHub Pages:
1. Push to GitHub
2. Go to Settings > Pages
3. Set source to "Deploy from a branch", branch `main`, folder `/docs`

## Tech Stack

- Quarto revealjs (presentation framework)
- D3.js (morphing charts, maps)
- Plotly.js (3D interactive charts)
- Python/pandas (data preparation only)
