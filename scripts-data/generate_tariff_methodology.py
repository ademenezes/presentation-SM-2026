"""
Generate a one-page PDF documenting tariff and NRW chart data sources,
methodology, and comparison with GWI data.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import os

# Colors from presentation palette
MAROON = HexColor("#8B1A2D")
NAVY = HexColor("#1A3A5C")
GREY = HexColor("#4a5568")
WHITE = HexColor("#ffffff")
LIGHT_GREY = HexColor("#e8e8e8")

OUTPUT = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                      "data_methodology.pdf")

TABLE_STYLE_NAVY = [
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 6.5),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ("TOPPADDING", (0, 0), (-1, -1), 1.5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#cccccc")),
]

TABLE_STYLE_MAROON = [
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 6.5),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("BACKGROUND", (0, 0), (-1, 0), MAROON),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
    ("TOPPADDING", (0, 0), (-1, -1), 1.5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
    ("GRID", (0, 0), (-1, -1), 0.3, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=16*mm, rightMargin=16*mm,
        topMargin=12*mm, bottomMargin=10*mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle", parent=styles["Heading1"],
        fontSize=13, leading=16, textColor=MAROON,
        fontName="Times-Bold", spaceAfter=1,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        fontSize=9.5, leading=12, textColor=NAVY,
        fontName="Times-Bold", spaceBefore=5, spaceAfter=1,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=7, leading=9.5, textColor=GREY,
        fontName="Helvetica", spaceAfter=1.5,
    )
    small = ParagraphStyle(
        "Small", parent=body_style,
        fontSize=6.5, leading=8.5, spaceAfter=1,
    )

    elements = []

    # ══════════════════════════════════════════════════════════
    # TITLE
    # ══════════════════════════════════════════════════════════
    elements.append(Paragraph(
        "Tariff, NRW & Affordability Charts: Data Sources & Methodology", title_style))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=MAROON, spaceAfter=3))

    # ══════════════════════════════════════════════════════════
    # SECTION 1: TARIFF CHART
    # ══════════════════════════════════════════════════════════
    elements.append(Paragraph("1. Tariff Chart", section_style))

    elements.append(Paragraph(
        "<b>Data sources.</b> Two independent sources merged: "
        "<b>(A)</b> IBNET Excel Export (23,592 records, 2,920 utilities, 222 countries, 1992\u20132025)  - "
        "official IBNET database with tariff structures and calculated costs for standardized consumption. "
        "<b>(B)</b> Web-scraped data (ibnet_automate)  - automated scraping via per-utility URLs (Tier 1) "
        "and 34 national regulator handlers (Tier 2), adding 2,011 new utilities across 45+ countries (April 2026). "
        "Merged dataset: <b>11,174 utilities across 223 countries</b>.",
        small))

    elements.append(Paragraph("<b>Regional coverage (tariff observations):</b>", small))
    t1 = Table([
        ["Region", "Total obs", "Peak/yr", "Years"],
        ["Europe and Central Asia", "12,229", "~1,400", "2014\u20132024"],
        ["Latin America and the Caribbean", "11,381", "~1,330", "2014\u20132024"],
        ["East Asia and Pacific", "3,430", "~470", "2014\u20132024"],
        ["Sub-Saharan Africa", "2,601", "~340", "2014\u20132024"],
        ["MENAAP", "279", "~57", "2015\u20132023"],
        ["South Asia", "58", "~34", "2015, 2017, 2024"],
    ], colWidths=[48*mm, 18*mm, 16*mm, 28*mm])
    t1.setStyle(TableStyle(TABLE_STYLE_NAVY))
    elements.append(t1)
    elements.append(Spacer(1, 2))

    elements.append(Paragraph(
        "<b>Methodology.</b> "
        "(1) CPI deflation to constant 2025 USD. "
        "(2) PPP adjustment (World Bank PA.NUS.PPP, 201 countries). "
        "(3) Median-of-medians (country median \u2192 regional median; prevents large countries from dominating). "
        "(4) 3-year rolling median smoothing (reduces composition effects). "
        "(5) Filters: \u22655 obs/region-year, tariffs >$0.50/15m\u00b3, years \u22642024, Iran excluded from MENAAP "
        "(subsidized ~$0.01/m\u00b3 tariffs collapse regional median). "
        "(6) Values \u00f7 15 for $/m\u00b3 display.",
        small))

    # ══════════════════════════════════════════════════════════
    # SECTION 2: GWI COMPARISON (tariff only)
    # ══════════════════════════════════════════════════════════
    elements.append(Paragraph("2. Tariff Comparison with GWI Data", section_style))
    elements.append(Paragraph(
        "",
        small))

    t2 = Table([
        ["Dimension", "IBNET (this chart)", "GWI"],
        ["Source", "IBNET Portal + web scraping", "Global Water Tariff Survey 2024"],
        ["Countries", "223", "196"],
        ["Utilities", "~11,174 (combined)", "630"],
        ["Year range", "2014\u20132024 (chart: 2016\u20132024)", "2011\u20132024"],
        ["Consumption basis", "15 m\u00b3/month", "15 m\u00b3/month"],
        ["Global median (PPP)", "~$2.54/m\u00b3 (2022)", "N/A"],
        ["Global median (constant USD)", "~$1.00/m\u00b3 (2022)", "$0.75/m\u00b3 (2022)"],
        ["Aggregation", "Median-of-medians", "Per-utility observation"],
        ["PPP adjusted?", "Yes (chart), No (raw)", "No"],
    ], colWidths=[35*mm, 60*mm, 50*mm])
    t2.setStyle(TableStyle(TABLE_STYLE_MAROON))
    elements.append(t2)
    elements.append(Spacer(1, 2))

    elements.append(Paragraph(
        "<b>Key differences:</b> "
        "In constant USD (no PPP), IBNET ($1.00/m\u00b3) and GWI ($0.75/m\u00b3) are in the same range -"
        "the gap reflects different utility samples and aggregation methods. "
        "PPP-adjusted IBNET median ($2.54/m\u00b3) is higher because PPP inflates tariffs "
        "in low/middle-income countries where purchasing power is lower.",
        small))

    # ══════════════════════════════════════════════════════════
    # SECTION 3: NRW CHART
    # ══════════════════════════════════════════════════════════
    elements.append(Paragraph("3. NRW Chart", section_style))

    elements.append(Paragraph(
        "<b>Data sources.</b> Three sources combined with priority deduplication "
        "(Regulators > NewIBNET > Old IBNET): "
        "<b>(A)</b> Regulators Performance Database  - 70,006 NRW observations from 19 countries "
        "(primarily SSA and LAC), utility-level data from national regulators. "
        "<b>(B)</b> NewIBNET.xlsx  - 387 observations (after dedup), 65 countries, 2021\u20132023. "
        "Extends ECA, MENAAP, and SAR coverage into recent years. "
        "<b>(C)</b> Old IBNET Export  - 24,092 observations, ~144 countries (after comma-separated "
        "number parsing fix that recovered 29,475 rows). "
        "Combined: <b>94,485 NRW observations, 151 countries</b>.",
        small))

    elements.append(Paragraph(
        "<b>NRW calculation:</b> (Water Produced \u2212 Water Sold) / Water Produced \u00d7 100. "
        "Values in (0, 1) range rescued by \u00d7100 (601 decimal-format values). "
        "Filtered to [5%, 100%] range.",
        small))

    elements.append(Paragraph("<b>Regional coverage (NRW, post-2016):</b>", small))
    t3 = Table([
        ["Region", "Data points", "Year range", "Avg NRW"],
        ["Sub-Saharan Africa", "9", "2016\u20132024", "41.7%"],
        ["Latin America and the Caribbean", "9", "2016\u20132024", "34.6%"],
        ["East Asia and Pacific", "9", "2016\u20132024", "37.4%"],
        ["Europe and Central Asia", "8", "2016\u20132023", "37.8%"],
        ["MENAAP", "2", "2016, 2021", "34.0%"],
        ["South Asia", "2", "2021, 2023", "25.1%"],
        ["Global", "9", "2016\u20132024", "39.2%"],
    ], colWidths=[48*mm, 18*mm, 24*mm, 16*mm])
    t3.setStyle(TableStyle(TABLE_STYLE_NAVY))
    elements.append(t3)
    elements.append(Spacer(1, 2))

    elements.append(Paragraph(
        "<b>Methodology.</b> Same as tariffs: median-of-medians aggregation "
        "(country median \u2192 regional median) + 3-year rolling median smoothing. "
        "Minimum 2 countries per region-year; Global requires \u22653 countries. "
        "<b>Note:</b> The Global median is the median of all individual country medians pooled across "
        "all regions -not the average of regional medians. Because many countries across SSA, EAP, "
        "and ECA have NRW above 35\u201350%, the Global median can exceed some individual regional medians "
        "(e.g., LAC or SAR) where fewer, lower-NRW countries dominate.",
        small))

    # ══════════════════════════════════════════════════════════
    # PAGE 2: AFFORDABILITY CHART
    # ══════════════════════════════════════════════════════════
    elements.append(PageBreak())

    elements.append(Paragraph(
        "4. Affordability Chart", section_style))

    elements.append(Paragraph(
        "<b>What it shows.</b> Median water bill (15 m\u00b3/month) as a percentage of income, "
        "comparing the national average (% of GDP per capita) with the bottom 20% income group, "
        "aggregated by World Bank income classification.",
        small))

    # Data sources
    elements.append(Paragraph(
        "<b>Data sources.</b> "
        "<b>(A)</b> IBNET Tariff Portal (countries.json) - provides affordGdp (bill as % of GDP pc) "
        "and affordB20 (bill as % of income for bottom 20% households) for 142 countries. "
        "Tariffs based on a standardized 15 m\u00b3/month consumption. "
        "<b>(B)</b> World Bank income classification (FY2026) - fetched from WB API, "
        "classifying 215 economies into four groups: Low income (25), Lower middle income (50), "
        "Upper middle income (54), High income (86).",
        small))

    # Methodology
    elements.append(Paragraph("<b>Methodology:</b>", small))
    elements.append(Paragraph(
        "1. Match each IBNET country (ISO3) to its WB income group. "
        "142 of 223 IBNET countries have both affordGdp and affordB20 data.",
        small))
    elements.append(Paragraph(
        "2. For each income group, compute the <b>median</b> of affordGdp and affordB20 "
        "across all matched countries. Median is preferred over mean to reduce the influence "
        "of extreme values (e.g., Mozambique at 113% B20).",
        small))
    elements.append(Paragraph(
        "3. Display as paired horizontal bars with the WHO 3% affordability threshold as reference.",
        small))

    # Results table
    elements.append(Paragraph("<b>Results:</b>", small))
    t4 = Table([
        ["Income group", "Countries", "Nat. avg (% GDP pc)", "Bottom 20% (% income)"],
        ["Low income", "15", "2.86%", "33.93%"],
        ["Lower middle income", "43", "1.25%", "12.58%"],
        ["Upper middle income", "40", "0.40%", "4.07%"],
        ["High income", "43", "0.56%", "3.65%"],
    ], colWidths=[40*mm, 20*mm, 36*mm, 40*mm])
    t4.setStyle(TableStyle(TABLE_STYLE_NAVY))
    elements.append(t4)
    elements.append(Spacer(1, 3))

    # Key metrics
    elements.append(Paragraph(
        "<b>affordGdp</b> = (monthly bill for 15 m\u00b3 / GDP per capita per month) \u00d7 100. "
        "Reflects the average household's ability to pay relative to national economic output. "
        "GDP per capita (PPP) sourced from World Bank indicator PA.NUS.PPP.",
        small))
    elements.append(Paragraph(
        "<b>affordB20</b> = (monthly bill for 15 m\u00b3 / estimated monthly consumption of bottom 20%) \u00d7 100. "
        "The bottom quintile's mean consumption "
        "is estimated from national household consumption per capita (World Bank NE.CON.PRVT.PC.CD) "
        "adjusted using the Gini coefficient (World Bank SI.POV.GINI): "
        "B20 consumption = HH consumption \u00d7 (1 - Gini)<super>1.5</super>. "
        "Available for 142 countries where both Gini and household consumption data exist.",
        small))

    # Key insight
    elements.append(Paragraph(
        "<b>Results.</b> "
        "In low-income countries, water bills consume a median of 34% of the poorest households' income, "
        "more than 11x the WHO affordability threshold of 3%. Even in lower-middle-income countries, "
        "the bottom 20% face bills at 4x the threshold. At the national average level, tariffs appear "
        "affordable across all income groups, masking severe distributional burden on the poor.",
        small))

    # Source note
    elements.append(Paragraph(
        "<b>Sources.</b> IBNET Tariff Portal (World Bank); World Bank income classification "
        "(https://datahelpdesk.worldbank.org/knowledgebase/articles/906519).",
        small))

    # ── Footer ──
    elements.append(Spacer(1, 3))
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=LIGHT_GREY, spaceAfter=2))
    elements.append(Paragraph(
        "World Bank Group | Global Water Department | Spring Meetings 2026",
        ParagraphStyle("Footer", parent=small, fontSize=6,
                       textColor=HexColor("#999999"))))

    doc.build(elements)
    print(f"PDF generated: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
