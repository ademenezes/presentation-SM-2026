/**
 * Hero Charts — D3.js
 *
 * Varied chart types for each slide:
 * - Tariffs: Animated line chart with spotlight annotations
 * - NRW: Animated bubble chart (Tariff vs NRW, sized by utilities)
 * - Metering: Horizontal bar chart
 * - Cost coverage: Lollipop/dot chart showing SSA decline
 * - Paradox: Dual-axis line chart
 */

(function () {
  "use strict";

  const TRANSITION_MS = 1200;

  const REGION_COLORS = {
    "Sub-Saharan Africa": "#e8553a",
    "East Asia & Pacific": "#0071bc",
    "Europe & Central Asia": "#6c4fa0",
    "Latin America & Caribbean": "#2b9f93",
    "Middle East, North Africa, Afghanistan & Pakistan": "#d4a017",
    "South Asia": "#c7365f",
    "Global": "#9ca3af",
  };

  const REGION_SHORT = {
    "Sub-Saharan Africa": "SSA",
    "East Asia & Pacific": "EAP",
    "Europe & Central Asia": "ECA",
    "Latin America & Caribbean": "LAC",
    "Middle East, North Africa, Afghanistan & Pakistan": "MENA",
    "South Asia": "SAR",
    "Global": "Global",
  };

  const REGION_FULL = {
    "Sub-Saharan Africa": "Sub-Saharan Africa",
    "East Asia & Pacific": "East Asia & Pacific",
    "Europe & Central Asia": "Europe & Central Asia",
    "Latin America & Caribbean": "Latin America",
    "Middle East, North Africa, Afghanistan & Pakistan": "MENA",
    "South Asia": "South Asia",
  };

  // NRW outlier filter
  function filterNRW(values) {
    return values.filter(d => d.value >= 15);
  }

  let datasets = {};

  async function loadData() {
    const [tariffs, nrw, metering, costCov, coverageMap] = await Promise.all([
      fetch("data/timeseries.json").then((r) => r.json()),
      fetch("data/nrw_trends.json").then((r) => r.json()),
      fetch("data/metering_trends.json").then((r) => r.json()),
      fetch("data/cost_coverage_trends.json").then((r) => r.json()),
      fetch("data/coverage_map.json").then((r) => r.json()),
    ]);
    datasets = { tariffs, nrw, metering, "cost-coverage": costCov, coverageMap };
  }

  function getDimensions() {
    const slideW = Reveal.getConfig().width || 1920;
    const slideH = Reveal.getConfig().height || 1080;
    return {
      W: slideW * 0.92,
      H: slideH * 0.82,
      slideW,
      slideH,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TARIFFS — Animated line chart with spotlight
  // ═══════════════════════════════════════════════════════════
  function renderTariffs() {
    const container = document.getElementById("hero-chart-tariffs");
    if (!container) return;
    const data = datasets.tariffs;
    if (!data) return;

    const { W, H } = getDimensions();
    const MARGIN = { top: 90, right: 200, bottom: 80, left: 90 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const regions = Object.keys(data).filter(r => r !== "Global");
    const lineData = regions.map(region => ({
      region,
      color: REGION_COLORS[region] || "#888",
      short: REGION_SHORT[region],
      values: (data[region] || [])
        .map(d => ({ year: d.year, value: d.median15m3 }))
        .filter(d => d.value != null && !isNaN(d.value) && d.year <= 2024),
    })).filter(d => d.values.length >= 2);

    let allYears = [];
    lineData.forEach(d => d.values.forEach(v => allYears.push(v.year)));
    const xScale = d3.scaleLinear().domain([d3.min(allYears), d3.max(allYears)]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 50]).range([height, 0]);

    // Grid
    g.append("g").selectAll("line").data(yScale.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "rgba(0,0,0,0.06)");

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(8))
      .selectAll("text").attr("fill", "#8898aa").attr("font-size", "14px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6))
      .selectAll("text").attr("fill", "#8898aa").attr("font-size", "14px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Y label
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -60).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "15px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("USD / 15 m\u00b3 (constant 2025)");

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 32)
      .attr("fill", "#1a1a2e").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Median Water Tariffs by Region");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Tariffs have been rising \u2014 utilities ARE trying to recover costs");

    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.value)).curve(d3.curveMonotoneX);

    // Sort for layering
    const sortOrder = ["South Asia", "Middle East, North Africa, Afghanistan & Pakistan",
      "Europe & Central Asia", "Latin America & Caribbean", "Sub-Saharan Africa", "East Asia & Pacific"];
    lineData.sort((a, b) => sortOrder.indexOf(a.region) - sortOrder.indexOf(b.region));

    lineData.forEach((series, i) => {
      const path = g.append("path").datum(series.values)
        .attr("fill", "none").attr("stroke", series.color)
        .attr("stroke-width", 3).attr("stroke-linecap", "round").attr("d", line);
      const totalLength = path.node().getTotalLength();
      path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
        .transition().duration(TRANSITION_MS).delay(i * 120).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

      const last = series.values[series.values.length - 1];
      g.append("circle").attr("cx", xScale(last.year)).attr("cy", yScale(last.value))
        .attr("r", 5).attr("fill", series.color).attr("stroke", "#fff").attr("stroke-width", 2)
        .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + i * 120).attr("opacity", 1);

      g.append("text").attr("x", xScale(last.year) + 14).attr("y", yScale(last.value) - 2)
        .attr("fill", series.color).attr("font-size", "13px").attr("font-weight", "600")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text(series.short)
        .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + i * 120 + 200).attr("opacity", 1);
      g.append("text").attr("x", xScale(last.year) + 14).attr("y", yScale(last.value) + 14)
        .attr("fill", series.color).attr("font-size", "12px").attr("font-weight", "400")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("$" + last.value.toFixed(1))
        .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + i * 120 + 300).attr("opacity", 0.8);
    });

    // Spotlight annotation: gap callout
    const insightG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.65).attr("height", 36).attr("rx", 6)
      .attr("fill", "#eef5fa").attr("stroke", "#0071bc").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#1a1a2e").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("38x gap between highest (East Asia: $43) and lowest (South Asia: $1) tariff regions");
    insightG.transition().duration(600).delay(TRANSITION_MS + lineData.length * 120 + 400).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // NRW — Animated bubble chart (Tariff vs NRW, sized by utilities)
  // ═══════════════════════════════════════════════════════════
  function renderNRWBubble() {
    const container = document.getElementById("hero-chart-nrw");
    if (!container) return;
    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 60, bottom: 90, left: 100 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 32)
      .attr("fill", "#1a1a2e").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("The Efficiency Challenge");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Higher tariffs don\u2019t automatically mean less water loss");

    // Data: regions with both tariff and NRW data
    const bubbleData = [
      { region: "Sub-Saharan Africa", tariff: 14.89, nrw: 45, utilities: 3433, hasNRW: true },
      { region: "Latin America & Caribbean", tariff: 16.67, nrw: 34.24, utilities: 9857, hasNRW: true },
      { region: "East Asia & Pacific", tariff: 42.72, nrw: 20.94, utilities: 399, hasNRW: true },
      // Regions without NRW data — show on X-axis only
      { region: "Europe & Central Asia", tariff: 16.90, nrw: null, utilities: 20807, hasNRW: false },
      { region: "Middle East, North Africa, Afghanistan & Pakistan", tariff: 35.21, nrw: null, utilities: 5, hasNRW: false },
      { region: "South Asia", tariff: 1.10, nrw: null, utilities: 0, hasNRW: false },
    ];

    const xScale = d3.scaleLinear().domain([0, 50]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 55]).range([height, 0]);
    const sizeScale = d3.scaleSqrt().domain([0, 20000]).range([8, 65]);

    // Grid
    g.append("g").selectAll("line").data(yScale.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "rgba(0,0,0,0.05)");
    // Vertical gridlines removed (Economist style: horizontal only)

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => "$" + d))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "14px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "14px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Axis labels
    g.append("text").attr("x", width / 2).attr("y", height + 50).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "15px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Median Tariff (USD / 15 m\u00b3)");
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -65).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "15px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Non-Revenue Water (%)");

    // "Ideal" zone annotation (low NRW, fair tariff)
    g.append("rect")
      .attr("x", xScale(10)).attr("y", yScale(25))
      .attr("width", xScale(50) - xScale(10)).attr("height", yScale(0) - yScale(25))
      .attr("fill", "#2b9f93").attr("opacity", 0)
      .transition().duration(800).delay(200)
      .attr("opacity", 0.04);
    g.append("text")
      .attr("x", xScale(32)).attr("y", yScale(3))
      .attr("text-anchor", "middle")
      .attr("fill", "#2b9f93").attr("font-size", "12px").attr("font-style", "italic")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Better performance zone")
      .attr("opacity", 0)
      .transition().duration(600).delay(600)
      .attr("opacity", 0.6);

    // Draw bubbles with staggered animation
    const withNRW = bubbleData.filter(d => d.hasNRW);

    // First: show regions WITHOUT NRW as small markers on X-axis
    const noNRW = bubbleData.filter(d => !d.hasNRW && d.utilities > 0);
    noNRW.forEach((d, i) => {
      const x = xScale(d.tariff);
      g.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", height - 5).attr("y2", height + 5)
        .attr("stroke", REGION_COLORS[d.region])
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .transition().duration(400).delay(400 + i * 100)
        .attr("opacity", 0.5);
      g.append("text")
        .attr("x", x).attr("y", height + 20)
        .attr("text-anchor", "middle")
        .attr("fill", REGION_COLORS[d.region])
        .attr("font-size", "11px").attr("font-style", "italic")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(REGION_SHORT[d.region] + " (no NRW data)")
        .attr("opacity", 0)
        .transition().duration(400).delay(500 + i * 100)
        .attr("opacity", 0.5);
    });

    // Then: animate bubbles with NRW data
    withNRW.forEach((d, i) => {
      const x = xScale(d.tariff);
      const y = yScale(d.nrw);
      const r = Math.max(sizeScale(d.utilities), 12);
      const color = REGION_COLORS[d.region];

      // Bubble starts at center, moves to position
      const bubble = g.append("circle")
        .attr("cx", width / 2).attr("cy", height / 2)
        .attr("r", 0)
        .attr("fill", color).attr("fill-opacity", 0.25)
        .attr("stroke", color).attr("stroke-width", 2.5);

      bubble.transition()
        .duration(800).delay(800 + i * 400)
        .attr("cx", x).attr("cy", y).attr("r", r);

      // Region label (appears after bubble lands)
      const labelG = g.append("g").attr("opacity", 0);

      // Label position: offset based on bubble size
      const labelX = x + r + 10;
      const labelY = y;

      labelG.append("text")
        .attr("x", labelX).attr("y", labelY - 8)
        .attr("fill", color).attr("font-size", "16px").attr("font-weight", "700")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(REGION_FULL[d.region]);

      labelG.append("text")
        .attr("x", labelX).attr("y", labelY + 10)
        .attr("fill", "#4a5568").attr("font-size", "13px")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(`$${d.tariff.toFixed(0)} tariff \u00b7 ${d.nrw.toFixed(0)}% NRW \u00b7 ${d.utilities.toLocaleString()} utilities`);

      labelG.transition().duration(500).delay(1200 + i * 400).attr("opacity", 1);
    });

    // Insight box
    const insightG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.7).attr("height", 36).attr("rx", 6)
      .attr("fill", "#fef3f2").attr("stroke", "#e8553a").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#1a1a2e").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("SSA: highest water loss (45%) despite rising tariffs \u2014 revenue isn\u2019t funding infrastructure repair");
    insightG.transition().duration(600).delay(800 + withNRW.length * 400 + 600).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // METERING — Horizontal bar chart
  // ═══════════════════════════════════════════════════════════
  function renderMetering() {
    const container = document.getElementById("hero-chart-metering");
    if (!container) return;
    const data = datasets.metering;
    if (!data) return;

    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 120, bottom: 80, left: 280 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 32)
      .attr("fill", "#1a1a2e").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Meter Coverage by Region");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("You can\u2019t manage what you don\u2019t measure \u2014 but metering alone isn\u2019t enough");

    // Get latest value per region
    const barData = Object.keys(data).filter(r => r !== "Global").map(region => {
      const vals = (data[region] || []).filter(d => d.median != null);
      const latest = vals[vals.length - 1];
      return latest ? {
        region,
        short: REGION_SHORT[region],
        full: REGION_FULL[region] || region,
        value: latest.median,
        year: latest.year,
        color: REGION_COLORS[region],
      } : null;
    }).filter(Boolean).sort((a, b) => b.value - a.value);

    if (barData.length === 0) return;

    const yBand = d3.scaleBand()
      .domain(barData.map(d => d.full))
      .range([0, Math.min(height, barData.length * 90)])
      .padding(0.35);

    const xScale = d3.scaleLinear().domain([0, 105]).range([0, width]);

    // Grid
    g.append("g").selectAll("line").data([25, 50, 75, 100]).enter()
      .append("line")
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("y1", 0).attr("y2", yBand.range()[1])
      .attr("stroke", "rgba(0,0,0,0.06)");

    // X axis at bottom
    g.append("g")
      .attr("transform", `translate(0,${yBand.range()[1]})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#8898aa").attr("font-size", "14px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Bars
    barData.forEach((d, i) => {
      const barY = yBand(d.full);
      const barH = yBand.bandwidth();

      // Background track
      g.append("rect")
        .attr("x", 0).attr("y", barY)
        .attr("width", xScale(105)).attr("height", barH)
        .attr("rx", 4)
        .attr("fill", "#f0f2f5");

      // Value bar (animated)
      g.append("rect")
        .attr("x", 0).attr("y", barY)
        .attr("width", 0).attr("height", barH)
        .attr("rx", 4)
        .attr("fill", d.color).attr("fill-opacity", 0.75)
        .transition().duration(800).delay(300 + i * 150)
        .attr("width", xScale(d.value));

      // Region label (left side)
      g.append("text")
        .attr("x", -12).attr("y", barY + barH / 2 + 5)
        .attr("text-anchor", "end")
        .attr("fill", "#1a1a2e").attr("font-size", "16px").attr("font-weight", "600")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(d.full);

      // Value label (end of bar)
      g.append("text")
        .attr("x", xScale(d.value) + 10).attr("y", barY + barH / 2 + 5)
        .attr("fill", d.color).attr("font-size", "16px").attr("font-weight", "700")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(d.value.toFixed(0) + "%")
        .attr("opacity", 0)
        .transition().duration(400).delay(600 + i * 150)
        .attr("opacity", 1);

      // Year label (small, after value)
      g.append("text")
        .attr("x", xScale(d.value) + 65).attr("y", barY + barH / 2 + 5)
        .attr("fill", "#8898aa").attr("font-size", "12px").attr("font-style", "italic")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text("(" + d.year + ")")
        .attr("opacity", 0)
        .transition().duration(400).delay(700 + i * 150)
        .attr("opacity", 0.7);
    });

    // Insight box
    const insightG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.75).attr("height", 36).attr("rx", 6)
      .attr("fill", "#eef5fa").attr("stroke", "#0071bc").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#1a1a2e").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("High metering alone doesn\u2019t fix NRW \u2014 Latin America has 98% metering but 34% water loss");
    insightG.transition().duration(600).delay(300 + barData.length * 150 + 500).attr("opacity", 1);

    // Data note
    svg.append("text")
      .attr("x", W - 20).attr("y", H - 10).attr("text-anchor", "end")
      .attr("fill", "#8898aa").attr("font-size", "11px").attr("font-style", "italic")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("East Asia & South Asia data ends 2017 and 2015 respectively")
      .attr("opacity", 0).transition().duration(400).delay(1500).attr("opacity", 0.7);
  }

  // ═══════════════════════════════════════════════════════════
  // COST COVERAGE — Lollipop dot chart showing SSA decline
  // ═══════════════════════════════════════════════════════════
  function renderCostCoverage() {
    const container = document.getElementById("hero-chart-cost-coverage");
    if (!container) return;
    const data = datasets["cost-coverage"];
    if (!data) return;

    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 100, bottom: 80, left: 100 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 32)
      .attr("fill", "#1a1a2e").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Operating Cost Coverage");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Sub-Saharan Africa: the only region with enough data \u2014 and the trend is declining");

    // SSA data
    const ssaData = (data["Sub-Saharan Africa"] || [])
      .filter(d => d.median != null)
      .map(d => ({ year: d.year, value: d.median }));

    if (ssaData.length === 0) return;

    const xScale = d3.scaleBand()
      .domain(ssaData.map(d => d.year))
      .range([0, width])
      .padding(0.4);

    const yScale = d3.scaleLinear().domain([0, 150]).range([height, 0]);

    // 100% breakeven line
    g.append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", yScale(100)).attr("y2", yScale(100))
      .attr("stroke", "#e8553a").attr("stroke-width", 2).attr("stroke-dasharray", "8,4");
    g.append("text")
      .attr("x", width + 8).attr("y", yScale(100) + 5)
      .attr("fill", "#e8553a").attr("font-size", "13px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("100% = Breakeven");

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "14px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#8898aa").attr("font-size", "14px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Y label
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -65).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "15px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Revenue / Operating Expenses (%)");

    // Lollipop stems + dots
    ssaData.forEach((d, i) => {
      const x = xScale(d.year) + xScale.bandwidth() / 2;
      const y = yScale(d.value);
      const isAbove = d.value >= 100;
      const color = isAbove ? "#2b9f93" : "#e8553a";

      // Stem from 100% line to value
      g.append("line")
        .attr("x1", x).attr("x2", x)
        .attr("y1", yScale(100)).attr("y2", yScale(100))
        .attr("stroke", color).attr("stroke-width", 3).attr("stroke-linecap", "round")
        .transition().duration(600).delay(400 + i * 100)
        .attr("y2", y);

      // Dot
      g.append("circle")
        .attr("cx", x).attr("cy", yScale(100))
        .attr("r", 8).attr("fill", color)
        .attr("stroke", "#fff").attr("stroke-width", 2)
        .transition().duration(600).delay(400 + i * 100)
        .attr("cy", y);

      // Value label
      g.append("text")
        .attr("x", x).attr("y", y - 16)
        .attr("text-anchor", "middle")
        .attr("fill", color).attr("font-size", "13px").attr("font-weight", "600")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(d.value.toFixed(0) + "%")
        .attr("opacity", 0)
        .transition().duration(400).delay(700 + i * 100)
        .attr("opacity", 1);
    });

    // Arrow showing decline
    const first = ssaData[0];
    const last = ssaData[ssaData.length - 1];
    if (first && last) {
      const arrowG = svg.append("g")
        .attr("transform", `translate(${MARGIN.left + width / 2}, ${MARGIN.top - 15})`)
        .attr("opacity", 0);
      arrowG.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "#e8553a").attr("font-size", "18px").attr("font-weight", "700")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(`${first.value.toFixed(0)}% \u2192 ${last.value.toFixed(0)}%  (\u2013${(first.value - last.value).toFixed(0)} pts)`);
      arrowG.transition().duration(600).delay(400 + ssaData.length * 100 + 300).attr("opacity", 1);
    }

    // Insight box
    const insightG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.65).attr("height", 36).attr("rx", 6)
      .attr("fill", "#fef3f2").attr("stroke", "#e8553a").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#1a1a2e").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Costs are rising faster than revenue \u2014 utilities are becoming financially unsustainable");
    insightG.transition().duration(600).delay(400 + ssaData.length * 100 + 600).attr("opacity", 1);

    // Data note
    svg.append("text")
      .attr("x", W - 20).attr("y", H - 10).attr("text-anchor", "end")
      .attr("fill", "#8898aa").attr("font-size", "11px").attr("font-style", "italic")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Only Sub-Saharan Africa has sufficient data for trend analysis")
      .attr("opacity", 0).transition().duration(400).delay(1800).attr("opacity", 0.7);
  }

  // ═══════════════════════════════════════════════════════════
  // PARADOX — Dual-axis line chart (tariffs up, NRW up)
  // ═══════════════════════════════════════════════════════════
  function renderParadox() {
    const container = document.getElementById("hero-chart-paradox");
    if (!container) return;
    const tariffData = datasets.tariffs;
    const nrwData = datasets.nrw;
    if (!tariffData || !nrwData) return;

    const { W, H } = getDimensions();
    const margin = { top: 90, right: 100, bottom: 80, left: 90 };
    container.innerHTML = "";
    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Title
    svg.append("text").attr("x", margin.left).attr("y", 32)
      .attr("fill", "#1a1a2e").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("The Investment Paradox");
    svg.append("text").attr("x", margin.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Tariffs are rising, but water losses are worsening \u2014 revenue isn\u2019t translating into system improvement");

    const ssaTariffs = (tariffData["Sub-Saharan Africa"] || [])
      .map(d => ({ year: d.year, value: d.median15m3 }))
      .filter(d => d.value != null && d.year >= 2012 && d.year <= 2024);

    const ssaNRW = (nrwData["Sub-Saharan Africa"] || [])
      .map(d => ({ year: d.year, value: d.median }))
      .filter(d => d.value != null && d.value >= 15 && d.year >= 2012 && d.year <= 2024);

    const globalNRW = (nrwData["Global"] || [])
      .map(d => ({ year: d.year, value: d.median }))
      .filter(d => d.value != null && d.value >= 15 && d.year >= 2012 && d.year <= 2024);

    if (ssaTariffs.length < 2 || ssaNRW.length < 2) return;

    const allYears = [...ssaTariffs.map(d => d.year), ...ssaNRW.map(d => d.year), ...globalNRW.map(d => d.year)];
    const xScale = d3.scaleLinear().domain([d3.min(allYears), d3.max(allYears)]).range([0, width]);
    const yLeft = d3.scaleLinear().domain([0, 20]).range([height, 0]);
    const yRight = d3.scaleLinear().domain([25, 50]).range([height, 0]);

    // Grid
    g.append("g").selectAll("line").data(yLeft.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", d => yLeft(d)).attr("y2", d => yLeft(d)).attr("stroke", "rgba(0,0,0,0.05)");

    // X axis
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(8))
      .selectAll("text").attr("fill", "#8898aa").attr("font-size", "14px");

    // Left Y (Tariff - blue)
    const leftAxis = g.append("g").call(d3.axisLeft(yLeft).ticks(5));
    leftAxis.selectAll("text").attr("fill", "#0071bc").attr("font-size", "13px");
    leftAxis.selectAll("path, line").attr("stroke", "#0071bc").attr("stroke-opacity", 0.3);
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -55).attr("text-anchor", "middle")
      .attr("fill", "#0071bc").attr("font-size", "14px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Tariff (USD / 15 m\u00b3)");

    // Right Y (NRW - red)
    const rightAxis = g.append("g").attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yRight).ticks(5));
    rightAxis.selectAll("text").attr("fill", "#e8553a").attr("font-size", "13px");
    rightAxis.selectAll("path, line").attr("stroke", "#e8553a").attr("stroke-opacity", 0.3);
    g.append("text").attr("transform", "rotate(90)")
      .attr("x", height / 2).attr("y", -width - 55).attr("text-anchor", "middle")
      .attr("fill", "#e8553a").attr("font-size", "14px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Non-Revenue Water (%)");
    g.selectAll(".domain").remove();

    const lineTariff = d3.line().x(d => xScale(d.year)).y(d => yLeft(d.value)).curve(d3.curveMonotoneX);
    const lineNRW = d3.line().x(d => xScale(d.year)).y(d => yRight(d.value)).curve(d3.curveMonotoneX);

    // Tariff line
    const tPath = g.append("path").datum(ssaTariffs).attr("fill", "none")
      .attr("stroke", "#0071bc").attr("stroke-width", 3.5).attr("stroke-linecap", "round").attr("d", lineTariff);
    const tLen = tPath.node().getTotalLength();
    tPath.attr("stroke-dasharray", tLen).attr("stroke-dashoffset", tLen)
      .transition().duration(TRANSITION_MS).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
      .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

    // NRW SSA line
    const nPath = g.append("path").datum(ssaNRW).attr("fill", "none")
      .attr("stroke", "#e8553a").attr("stroke-width", 3.5).attr("stroke-linecap", "round").attr("d", lineNRW);
    const nLen = nPath.node().getTotalLength();
    nPath.attr("stroke-dasharray", nLen).attr("stroke-dashoffset", nLen)
      .transition().duration(TRANSITION_MS).delay(300).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
      .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

    // Global NRW dashed
    if (globalNRW.length >= 2) {
      const gnPath = g.append("path").datum(globalNRW).attr("fill", "none")
        .attr("stroke", "#e8553a").attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4").attr("stroke-opacity", 0.4).attr("d", lineNRW);
      const gnLen = gnPath.node().getTotalLength();
      gnPath.attr("stroke-dasharray", gnLen).attr("stroke-dashoffset", gnLen)
        .transition().duration(TRANSITION_MS).delay(500).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
        .on("end", function () { d3.select(this).attr("stroke-dasharray", "6,4"); });
    }

    // Endpoints
    const tLast = ssaTariffs[ssaTariffs.length - 1];
    const nLast = ssaNRW[ssaNRW.length - 1];
    g.append("circle").attr("cx", xScale(tLast.year)).attr("cy", yLeft(tLast.value))
      .attr("r", 6).attr("fill", "#0071bc").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 200).attr("opacity", 1);
    g.append("text").attr("x", xScale(tLast.year) - 60).attr("y", yLeft(tLast.value) - 14)
      .attr("fill", "#0071bc").attr("font-size", "16px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Tariffs $" + tLast.value.toFixed(1))
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 400).attr("opacity", 1);
    g.append("text").attr("x", xScale(tLast.year) - 15).attr("y", yLeft(tLast.value) - 30)
      .attr("fill", "#0071bc").attr("font-size", "24px").text("\u2191")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 600).attr("opacity", 0.8);
    g.append("circle").attr("cx", xScale(nLast.year)).attr("cy", yRight(nLast.value))
      .attr("r", 6).attr("fill", "#e8553a").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 500).attr("opacity", 1);
    g.append("text").attr("x", xScale(nLast.year) - 50).attr("y", yRight(nLast.value) + 28)
      .attr("fill", "#e8553a").attr("font-size", "16px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("NRW " + nLast.value.toFixed(0) + "%")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 700).attr("opacity", 1);
    g.append("text").attr("x", xScale(nLast.year) + 5).attr("y", yRight(nLast.value) + 45)
      .attr("fill", "#e8553a").attr("font-size", "24px").text("\u2191")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 800).attr("opacity", 0.8);

    // Legend
    const legendData = [
      { label: "SSA Tariff (left axis)", color: "#0071bc", dashed: false },
      { label: "SSA Non-Revenue Water (right axis)", color: "#e8553a", dashed: false },
      { label: "Global NRW (right axis)", color: "#e8553a", dashed: true },
    ];
    const legendG = svg.append("g").attr("transform", `translate(${margin.left + 10}, ${margin.top - 15})`);
    legendData.forEach((item, i) => {
      const lg = legendG.append("g").attr("transform", `translate(${i * 280}, 0)`);
      lg.append("line").attr("x1", 0).attr("x2", 24).attr("y1", 0).attr("y2", 0)
        .attr("stroke", item.color).attr("stroke-width", 2.5)
        .attr("stroke-dasharray", item.dashed ? "5,3" : "none");
      lg.append("text").attr("x", 30).attr("y", 4)
        .attr("fill", "#4a5568").attr("font-size", "12px")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text(item.label);
    });

    // Insight
    const insightG = svg.append("g")
      .attr("transform", `translate(${margin.left + width * 0.2}, ${H - 50})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.6).attr("height", 36).attr("rx", 6)
      .attr("fill", "#fef3f2").attr("stroke", "#e8553a").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#1a1a2e").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Tariff revenue is not being invested in reducing water losses \u2014 the system is leaking money");
    insightG.transition().duration(600).delay(TRANSITION_MS + 1000).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // DISPATCH
  // ═══════════════════════════════════════════════════════════
  const RENDERERS = {
    tariffs: renderTariffs,
    nrw: renderNRWBubble,
    metering: renderMetering,
    "cost-coverage": renderCostCoverage,
    paradox: renderParadox,
  };

  let dataLoaded = false;

  async function handleSlide(stateKey) {
    if (!dataLoaded) {
      await loadData();
      dataLoaded = true;
    }
    const renderer = RENDERERS[stateKey];
    if (renderer) renderer();
  }

  document.addEventListener("hero-morph", (e) => {
    handleSlide(e.detail.state);
  });

  if (typeof Reveal !== "undefined") {
    Reveal.on("ready", () => {
      const slide = Reveal.getCurrentSlide();
      if (slide && RENDERERS[slide.id]) handleSlide(slide.id);
    });
  }
})();
