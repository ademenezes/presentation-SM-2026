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
    "Sub-Saharan Africa": "#8b1a2d",
    "East Asia and Pacific": "#2e6da4",
    "Europe and Central Asia": "#6699cc",
    "Latin America and the Caribbean": "#d4909e",
    "Middle East, North Africa, Afghanistan and Pakistan": "#b85c70",
    "South Asia": "#1a3a5c",
    "Global": "#9ca3af",
  };

  const REGION_SHORT = {
    "Sub-Saharan Africa": "SSA",
    "East Asia and Pacific": "EAP",
    "Europe and Central Asia": "ECA",
    "Latin America and the Caribbean": "LAC",
    "Middle East, North Africa, Afghanistan and Pakistan": "MENAAP",
    "South Asia": "SAR",
    "Global": "Global",
  };

  const REGION_FULL = {
    "Sub-Saharan Africa": "Sub-Saharan Africa",
    "East Asia and Pacific": "East Asia and Pacific",
    "Europe and Central Asia": "Europe and Central Asia",
    "Latin America and the Caribbean": "Latin America",
    "Middle East, North Africa, Afghanistan and Pakistan": "MENAAP",
    "South Asia": "South Asia",
  };

  // NRW outlier filter
  function filterNRW(values) {
    return values.filter(d => d.value >= 15);
  }

  let datasets = {};

  async function loadData() {
    const [tariffs, tariffsNominal, nrw, metering, costCov, coverageMap] = await Promise.all([
      fetch("data/timeseries.json?v=2").then((r) => r.json()),
      fetch("data/timeseries_nominal.json?v=1").then((r) => r.json()),
      fetch("data/nrw_trends.json").then((r) => r.json()),
      fetch("data/metering_trends.json").then((r) => r.json()),
      fetch("data/cost_coverage_trends.json").then((r) => r.json()),
      fetch("data/coverage_map.json").then((r) => r.json()),
    ]);
    datasets = { tariffs, "tariffs-nominal": tariffsNominal, nrw, metering, "cost-coverage": costCov, coverageMap };
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
  // TARIFFS — Shared renderer for PPP and Nominal
  // ═══════════════════════════════════════════════════════════
  function renderTariffChart(containerId, data, opts) {
    const container = document.getElementById(containerId);
    if (!container || !data) return;

    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 210, bottom: 80, left: 100 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;
    const ANIM = 2000; // slower animation

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const regions = Object.keys(data).filter(r => r !== "Global");
    const lineData = regions.map(region => ({
      region, color: REGION_COLORS[region] || "#888", short: REGION_SHORT[region],
      values: (data[region] || []).map(d => ({ year: d.year, value: d.median15m3 }))
        .filter(d => d.value != null && !isNaN(d.value) && d.year >= 2016 && d.year <= 2024),
    })).filter(d => d.values.length >= 2);

    const globalData = (data["Global"] || []).map(d => ({ year: d.year, value: d.median15m3 }))
      .filter(d => d.value != null && !isNaN(d.value) && d.year >= 2016 && d.year <= 2024);

    let allYears = [];
    lineData.forEach(d => d.values.forEach(v => allYears.push(v.year)));
    if (globalData.length) globalData.forEach(v => allYears.push(v.year));
    const xScale = d3.scaleLinear().domain([2016, 2024]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, opts.yMax]).range([height, 0]);

    // Grid
    g.append("g").selectAll("line").data(yScale.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d)).attr("stroke", "rgba(0,0,0,0.06)");

    // Axes — bigger fonts
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(8))
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "20px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6))
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "20px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Y label
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -72).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "20px").attr("font-weight", "500")
      .attr("font-family", "'Nunito', -apple-system, sans-serif").text(opts.yLabel);

    // Title (main insight)
    svg.append("text").attr("x", MARGIN.left).attr("y", 38)
      .attr("fill", "#8b1a2d").attr("font-size", "36px").attr("font-weight", "900")
      .attr("font-family", "'Playfair Display', Georgia, serif").text(opts.title);
    // Notes line
    svg.append("text").attr("x", MARGIN.left).attr("y", 72)
      .attr("fill", "#4a5568").attr("font-size", "20px")
      .attr("font-family", "'Nunito', -apple-system, sans-serif").text(opts.notes);

    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.value)).curve(d3.curveMonotoneX);

    const sortOrder = ["South Asia", "Middle East, North Africa, Afghanistan and Pakistan",
      "Europe and Central Asia", "Latin America and the Caribbean", "Sub-Saharan Africa", "East Asia and Pacific"];
    lineData.sort((a, b) => sortOrder.indexOf(a.region) - sortOrder.indexOf(b.region));

    // Track regional paths for fading
    const regionPaths = [];

    lineData.forEach((series, i) => {
      const path = g.append("path").datum(series.values)
        .attr("fill", "none").attr("stroke", series.color)
        .attr("stroke-width", 4).attr("stroke-linecap", "round").attr("d", line);
      regionPaths.push(path);
      const totalLength = path.node().getTotalLength();
      path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
        .transition().duration(ANIM).delay(i * 200).ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0)
        .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

      const last = series.values[series.values.length - 1];
      const labelG = g.append("g").attr("class", "region-label").attr("opacity", 0);
      labelG.append("circle").attr("cx", xScale(last.year)).attr("cy", yScale(last.value))
        .attr("r", 7).attr("fill", series.color).attr("stroke", "#fff").attr("stroke-width", 2);
      labelG.append("text").attr("x", xScale(last.year) + 16).attr("y", yScale(last.value) - 2)
        .attr("fill", series.color).attr("font-size", "18px").attr("font-weight", "700")
        .attr("font-family", "'Nunito', -apple-system, sans-serif").text(series.short);
      labelG.append("text").attr("x", xScale(last.year) + 16).attr("y", yScale(last.value) + 18)
        .attr("fill", series.color).attr("font-size", "16px").attr("font-weight", "500")
        .attr("font-family", "'Nunito', -apple-system, sans-serif").text("$" + last.value.toFixed(0));
      labelG.transition().duration(500).delay(ANIM + i * 200).attr("opacity", 1);
    });

    // Store World line elements (hidden until fragment triggers)
    if (globalData.length >= 2) {
      const globalLine = d3.line().x(d => xScale(d.year)).y(d => yScale(d.value)).curve(d3.curveMonotoneX);
      const gPath = g.append("path").datum(globalData)
        .attr("fill", "none").attr("stroke", "#1a3a5c")
        .attr("stroke-width", 6).attr("stroke-linecap", "round").attr("d", globalLine)
        .attr("opacity", 0);
      const gLen = gPath.node().getTotalLength();
      gPath.attr("stroke-dasharray", gLen).attr("stroke-dashoffset", gLen);

      const gLast = globalData[globalData.length - 1];
      const wLabelG = g.append("g").attr("opacity", 0);
      wLabelG.append("circle").attr("cx", xScale(gLast.year)).attr("cy", yScale(gLast.value))
        .attr("r", 9).attr("fill", "#1a3a5c").attr("stroke", "#fff").attr("stroke-width", 3);
      wLabelG.append("text").attr("x", xScale(gLast.year) + 18).attr("y", yScale(gLast.value) - 6)
        .attr("fill", "#1a3a5c").attr("font-size", "24px").attr("font-weight", "900")
        .attr("font-family", "'Playfair Display', Georgia, serif").text("World Average");
      wLabelG.append("text").attr("x", xScale(gLast.year) + 18).attr("y", yScale(gLast.value) + 20)
        .attr("fill", "#1a3a5c").attr("font-size", "20px").attr("font-weight", "600")
        .attr("font-family", "'Nunito', -apple-system, sans-serif").text("$" + gLast.value.toFixed(0));

      // Store reveal function on the container for fragment triggering
      container._showWorldLine = function () {
        // Fade regional lines
        regionPaths.forEach(function (p) {
          p.transition().duration(800).attr("stroke-opacity", 0.3);
        });
        g.selectAll(".region-label").each(function () {
          d3.select(this).transition().duration(800).attr("opacity", 0.35);
        });
        // Draw World line
        gPath.transition().delay(600).duration(ANIM)
          .attr("opacity", 1).attr("stroke-dashoffset", 0)
          .ease(d3.easeCubicOut)
          .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });
        wLabelG.transition().delay(600 + ANIM).duration(500).attr("opacity", 1);
      };
      container._hideWorldLine = function () {
        // Restore regional lines
        regionPaths.forEach(function (p) {
          p.transition().duration(600).attr("stroke-opacity", 1);
        });
        g.selectAll(".region-label").each(function () {
          d3.select(this).transition().duration(600).attr("opacity", 1);
        });
        // Hide World line
        gPath.transition().duration(400).attr("opacity", 0)
          .on("end", function () { d3.select(this).attr("stroke-dashoffset", gLen); });
        wLabelG.transition().duration(400).attr("opacity", 0);
      };
    }
  }

  function renderTariffs() {
    // Convert from $/15m³ to $/m³
    const transformed = {};
    for (const [key, arr] of Object.entries(datasets.tariffs)) {
      transformed[key] = arr.map(d => ({ ...d, median15m3: d.median15m3 / 15 }));
    }
    renderTariffChart("hero-chart-tariffs", transformed, {
      yMax: 4,
      yLabel: "PPP USD / m\u00b3",
      title: "Water Is More Expensive Than It Looks",
      notes: "Median tariffs by region, PPP-adjusted (World Bank) \u00b7 3-year rolling median \u00b7 2016\u20132024",
    });
  }

  function renderTariffsNominal() {
    renderTariffChart("hero-chart-tariffs-nominal", datasets["tariffs-nominal"], {
      yMax: 50,
      yLabel: "USD / 15 m\u00b3 (constant 2025)",
      title: "Tariffs Are Rising, But Still Insufficient",
      notes: "Median tariffs by region, constant 2025 USD (not PPP-adjusted) \u00b7 3-year rolling median \u00b7 2016\u20132024",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // NRW — Animated bubble chart (Tariff vs NRW, sized by utilities)
  // ═══════════════════════════════════════════════════════════
  function renderNRWBubble() {
    const container = document.getElementById("hero-chart-nrw");
    if (!container) return;
    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 80, bottom: 90, left: 100 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title (insight-led)
    svg.append("text").attr("x", MARGIN.left).attr("y", 38)
      .attr("fill", "#8b1a2d").attr("font-size", "36px").attr("font-weight", "900")
      .attr("font-family", "'Playfair Display', Georgia, serif").text("SSA Loses 45% of Its Water Before It Reaches Customers");
    svg.append("text").attr("x", MARGIN.left).attr("y", 72)
      .attr("fill", "#4a5568").attr("font-size", "20px")
      .attr("font-family", "'Nunito', -apple-system, sans-serif")
      .text("Median tariff (PPP) vs. non-revenue water (%) \u00b7 Bubble size = regional population");

    // All 6 regions now have NRW data — population-sized bubbles
    const bubbleData = [
      { region: "Sub-Saharan Africa", tariff: 40.8, nrw: 45.0, pop: 1.2 },
      { region: "Latin America and the Caribbean", tariff: 27.8, nrw: 34.6, pop: 0.66 },
      { region: "East Asia and Pacific", tariff: 45.0, nrw: 24.9, pop: 2.3 },
      { region: "Europe and Central Asia", tariff: 37.9, nrw: 34.3, pop: 0.93 },
      { region: "Middle East, North Africa, Afghanistan and Pakistan", tariff: 37.4, nrw: 26.7, pop: 0.46 },
      { region: "South Asia", tariff: 4.6, nrw: 20.6, pop: 2.0 },
    ];

    const xScale = d3.scaleLinear().domain([0, 55]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 55]).range([height, 0]);
    const sizeScale = d3.scaleSqrt().domain([0, 2.5]).range([20, 80]);

    // Grid
    g.append("g").selectAll("line").data(yScale.ticks(5)).enter()
      .append("line").attr("x1", 0).attr("x2", width)
      .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
      .attr("stroke", "rgba(0,0,0,0.05)");

    // Axes — bigger fonts
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => "$" + d))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "20px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "20px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Axis labels
    g.append("text").attr("x", width / 2).attr("y", height + 55).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "20px").attr("font-weight", "500")
      .attr("font-family", "'Nunito', -apple-system, sans-serif").text("Median Tariff (PPP USD / 15 m\u00b3)");
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -68).attr("text-anchor", "middle")
      .attr("fill", "#4a5568").attr("font-size", "20px").attr("font-weight", "500")
      .attr("font-family", "'Nunito', -apple-system, sans-serif").text("Non-Revenue Water (%)");

    // Animate all bubbles — slower stagger
    bubbleData.forEach((d, i) => {
      const x = xScale(d.tariff);
      const y = yScale(d.nrw);
      const r = sizeScale(d.pop);
      const color = REGION_COLORS[d.region];

      const bubble = g.append("circle")
        .attr("cx", width / 2).attr("cy", height / 2).attr("r", 0)
        .attr("fill", color).attr("fill-opacity", 0.25)
        .attr("stroke", color).attr("stroke-width", 2.5);

      bubble.transition().duration(1800).delay(600 + i * 600)
        .ease(d3.easeCubicOut)
        .attr("cx", x).attr("cy", y).attr("r", r);

      const labelG = g.append("g").attr("opacity", 0);
      const labelX = x + r + 12;
      const labelY = y;

      labelG.append("text").attr("x", labelX).attr("y", labelY - 4)
        .attr("fill", color).attr("font-size", "18px").attr("font-weight", "700")
        .attr("font-family", "'Nunito', -apple-system, sans-serif")
        .text(REGION_SHORT[d.region]);
      labelG.append("text").attr("x", labelX).attr("y", labelY + 16)
        .attr("fill", "#4a5568").attr("font-size", "15px")
        .attr("font-family", "'Nunito', -apple-system, sans-serif")
        .text("$" + d.tariff.toFixed(0) + " tariff \u00b7 " + d.nrw.toFixed(0) + "% NRW");

      labelG.transition().duration(600).delay(1600 + i * 600).attr("opacity", 1);
    });

    // Population note at bottom
    svg.append("text")
      .attr("x", MARGIN.left).attr("y", H - 30)
      .attr("fill", "#6b7280").attr("font-size", "13px").attr("font-style", "italic")
      .attr("font-family", "'Nunito', -apple-system, sans-serif")
      .text("Bubble size represents regional population (World Bank, 2024): SAR 2.0B \u00b7 EAP 2.3B \u00b7 SSA 1.2B \u00b7 ECA 0.9B \u00b7 LAC 0.7B \u00b7 MENA 0.5B");
  }

  // ═══════════════════════════════════════════════════════════
  // AFFORDABILITY — Paired horizontal bars (GDP vs B20)
  // ═══════════════════════════════════════════════════════════
  async function renderAffordability() {
    const container = document.getElementById("hero-chart-affordability");
    if (!container) return;
    container.innerHTML = "";

    let rawData = await fetch("data/affordability_gap.json?v=1").then(r => r.json());
    if (!rawData || !rawData.length) return;

    // Filter to interesting cases and limit
    const data = rawData.filter(d => d.affordB20 > 3).slice(0, 10);
    if (!data.length) return;

    const { W, H } = getDimensions();
    const MARGIN = { top: 100, right: 120, bottom: 60, left: 260 };
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;
    const FONT = "'Nunito', -apple-system, sans-serif";
    const FONT_H = "'Playfair Display', Georgia, serif";

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 38)
      .attr("fill", "#8b1a2d").attr("font-size", "36px").attr("font-weight", "900")
      .attr("font-family", FONT_H).text("Tariffs Are Low on Average : But Not for the Poor");
    svg.append("text").attr("x", MARGIN.left).attr("y", 72)
      .attr("fill", "#4a5568").attr("font-size", "20px")
      .attr("font-family", FONT).text("Monthly water bill (15 m\u00b3) as % of income \u00b7 National average vs bottom 20%");

    const yBand = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, height])
      .padding(0.3);

    const maxVal = Math.min(d3.max(data, d => d.affordB20), 45);
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, width]);

    // Grid
    g.append("g").selectAll("line").data(xScale.ticks(5)).enter()
      .append("line").attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
      .attr("y1", 0).attr("y2", height).attr("stroke", "rgba(0,0,0,0.06)");

    // WHO 3% threshold
    g.append("line").attr("x1", xScale(3)).attr("x2", xScale(3))
      .attr("y1", -10).attr("y2", height + 10)
      .attr("stroke", "#b85c70").attr("stroke-width", 2).attr("stroke-dasharray", "8,4");
    g.append("text").attr("x", xScale(3) + 6).attr("y", -4)
      .attr("fill", "#b85c70").attr("font-size", "14px").attr("font-weight", "600")
      .attr("font-family", FONT).text("3% WHO threshold");

    // X axis
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "18px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Bars
    const barH = yBand.bandwidth() / 2 - 2;

    data.forEach((d, i) => {
      const y = yBand(d.name);
      const gdpVal = Math.min(d.affordGdp, maxVal);
      const b20Val = Math.min(d.affordB20, maxVal);

      // Country label
      g.append("text").attr("x", -12).attr("y", y + yBand.bandwidth() / 2 + 5)
        .attr("text-anchor", "end").attr("fill", "#282c34")
        .attr("font-size", "17px").attr("font-weight", "600").attr("font-family", FONT)
        .text(d.name);

      // GDP bar (navy — national average)
      g.append("rect").attr("x", 0).attr("y", y)
        .attr("width", 0).attr("height", barH).attr("rx", 3)
        .attr("fill", "#1a3a5c").attr("fill-opacity", 0.8)
        .transition().duration(800).delay(200 + i * 80)
        .attr("width", xScale(gdpVal));

      // B20 bar (maroon — bottom 20%)
      g.append("rect").attr("x", 0).attr("y", y + barH + 4)
        .attr("width", 0).attr("height", barH).attr("rx", 3)
        .attr("fill", "#8b1a2d").attr("fill-opacity", 0.8)
        .transition().duration(800).delay(300 + i * 80)
        .attr("width", xScale(b20Val));

      // Value labels
      g.append("text").attr("x", xScale(gdpVal) + 8).attr("y", y + barH / 2 + 4)
        .attr("fill", "#1a3a5c").attr("font-size", "14px").attr("font-weight", "600")
        .attr("font-family", FONT).text(d.affordGdp.toFixed(1) + "%")
        .attr("opacity", 0).transition().duration(400).delay(600 + i * 80).attr("opacity", 1);

      g.append("text").attr("x", xScale(b20Val) + 8).attr("y", y + barH + 4 + barH / 2 + 4)
        .attr("fill", "#8b1a2d").attr("font-size", "14px").attr("font-weight", "600")
        .attr("font-family", FONT).text((d.affordB20 > maxVal ? ">" + maxVal : d.affordB20.toFixed(1)) + "%")
        .attr("opacity", 0).transition().duration(400).delay(700 + i * 80).attr("opacity", 1);
    });

    // Legend
    const legG = svg.append("g").attr("transform", `translate(${MARGIN.left + width - 300}, ${MARGIN.top - 20})`);
    legG.append("rect").attr("width", 14).attr("height", 14).attr("rx", 2).attr("fill", "#1a3a5c").attr("fill-opacity", 0.8);
    legG.append("text").attr("x", 20).attr("y", 12).attr("fill", "#4a5568").attr("font-size", "15px").attr("font-family", FONT).text("National average (% of GDP pc)");
    legG.append("rect").attr("y", 22).attr("width", 14).attr("height", 14).attr("rx", 2).attr("fill", "#8b1a2d").attr("fill-opacity", 0.8);
    legG.append("text").attr("x", 20).attr("y", 34).attr("fill", "#4a5568").attr("font-size", "15px").attr("font-family", FONT).text("Bottom 20% income group");
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
      .attr("fill", "#282c34").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Meter Coverage by Region");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("You can\u2019t manage what you don\u2019t measure : but metering alone isn\u2019t enough");

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
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "14px");
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
        .attr("fill", "#d8e8f0");

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
        .attr("fill", "#282c34").attr("font-size", "16px").attr("font-weight", "600")
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
        .attr("fill", "#6b7280").attr("font-size", "12px").attr("font-style", "italic")
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
      .attr("fill", "#f0e8e4").attr("stroke", "#1a3a5c").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#282c34").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("High metering alone doesn\u2019t fix NRW : Latin America has 98% metering but 34% water loss");
    insightG.transition().duration(600).delay(300 + barData.length * 150 + 500).attr("opacity", 1);

    // Data note
    svg.append("text")
      .attr("x", W - 20).attr("y", H - 10).attr("text-anchor", "end")
      .attr("fill", "#6b7280").attr("font-size", "11px").attr("font-style", "italic")
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
      .attr("fill", "#282c34").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Operating Cost Coverage");
    svg.append("text").attr("x", MARGIN.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Sub-Saharan Africa: the only region with enough data : and the trend is declining");

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
      .attr("stroke", "#b85c70").attr("stroke-width", 2).attr("stroke-dasharray", "8,4");
    g.append("text")
      .attr("x", width + 8).attr("y", yScale(100) + 5)
      .attr("fill", "#b85c70").attr("font-size", "13px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("100% = Breakeven");

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text").attr("fill", "#4a5568").attr("font-size", "14px");
    g.append("g").call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + "%"))
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "14px");
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
      const color = isAbove ? "#2e6da4" : "#b85c70";

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
        .attr("fill", "#b85c70").attr("font-size", "18px").attr("font-weight", "700")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(`${first.value.toFixed(0)}% \u2192 ${last.value.toFixed(0)}%  (\u2013${(first.value - last.value).toFixed(0)} pts)`);
      arrowG.transition().duration(600).delay(400 + ssaData.length * 100 + 300).attr("opacity", 1);
    }

    // Insight box
    const insightG = svg.append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`).attr("opacity", 0);
    insightG.append("rect").attr("width", width * 0.65).attr("height", 36).attr("rx", 6)
      .attr("fill", "#f8f5f0").attr("stroke", "#b85c70").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#282c34").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Costs are rising faster than revenue : utilities are becoming financially unsustainable");
    insightG.transition().duration(600).delay(400 + ssaData.length * 100 + 600).attr("opacity", 1);

    // Data note
    svg.append("text")
      .attr("x", W - 20).attr("y", H - 10).attr("text-anchor", "end")
      .attr("fill", "#6b7280").attr("font-size", "11px").attr("font-style", "italic")
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
      .attr("fill", "#282c34").attr("font-size", "26px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("The Investment Paradox");
    svg.append("text").attr("x", margin.left).attr("y", 58)
      .attr("fill", "#4a5568").attr("font-size", "16px")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Tariffs are rising, but water losses are worsening : revenue isn\u2019t translating into system improvement");

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
      .selectAll("text").attr("fill", "#6b7280").attr("font-size", "14px");

    // Left Y (Tariff - blue)
    const leftAxis = g.append("g").call(d3.axisLeft(yLeft).ticks(5));
    leftAxis.selectAll("text").attr("fill", "#1a3a5c").attr("font-size", "13px");
    leftAxis.selectAll("path, line").attr("stroke", "#1a3a5c").attr("stroke-opacity", 0.3);
    g.append("text").attr("transform", "rotate(-90)")
      .attr("x", -height / 2).attr("y", -55).attr("text-anchor", "middle")
      .attr("fill", "#1a3a5c").attr("font-size", "14px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Tariff (PPP USD / 15 m\u00b3)");

    // Right Y (NRW - red)
    const rightAxis = g.append("g").attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yRight).ticks(5));
    rightAxis.selectAll("text").attr("fill", "#b85c70").attr("font-size", "13px");
    rightAxis.selectAll("path, line").attr("stroke", "#b85c70").attr("stroke-opacity", 0.3);
    g.append("text").attr("transform", "rotate(90)")
      .attr("x", height / 2).attr("y", -width - 55).attr("text-anchor", "middle")
      .attr("fill", "#b85c70").attr("font-size", "14px").attr("font-weight", "600")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Non-Revenue Water (%)");
    g.selectAll(".domain").remove();

    const lineTariff = d3.line().x(d => xScale(d.year)).y(d => yLeft(d.value)).curve(d3.curveMonotoneX);
    const lineNRW = d3.line().x(d => xScale(d.year)).y(d => yRight(d.value)).curve(d3.curveMonotoneX);

    // Tariff line
    const tPath = g.append("path").datum(ssaTariffs).attr("fill", "none")
      .attr("stroke", "#1a3a5c").attr("stroke-width", 3.5).attr("stroke-linecap", "round").attr("d", lineTariff);
    const tLen = tPath.node().getTotalLength();
    tPath.attr("stroke-dasharray", tLen).attr("stroke-dashoffset", tLen)
      .transition().duration(TRANSITION_MS).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
      .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

    // NRW SSA line
    const nPath = g.append("path").datum(ssaNRW).attr("fill", "none")
      .attr("stroke", "#b85c70").attr("stroke-width", 3.5).attr("stroke-linecap", "round").attr("d", lineNRW);
    const nLen = nPath.node().getTotalLength();
    nPath.attr("stroke-dasharray", nLen).attr("stroke-dashoffset", nLen)
      .transition().duration(TRANSITION_MS).delay(300).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
      .on("end", function () { d3.select(this).attr("stroke-dasharray", "none"); });

    // Global NRW dashed
    if (globalNRW.length >= 2) {
      const gnPath = g.append("path").datum(globalNRW).attr("fill", "none")
        .attr("stroke", "#b85c70").attr("stroke-width", 2)
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
      .attr("r", 6).attr("fill", "#1a3a5c").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 200).attr("opacity", 1);
    g.append("text").attr("x", xScale(tLast.year) - 60).attr("y", yLeft(tLast.value) - 14)
      .attr("fill", "#1a3a5c").attr("font-size", "16px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("Tariffs $" + tLast.value.toFixed(1))
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 400).attr("opacity", 1);
    g.append("text").attr("x", xScale(tLast.year) - 15).attr("y", yLeft(tLast.value) - 30)
      .attr("fill", "#1a3a5c").attr("font-size", "24px").text("\u2191")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 600).attr("opacity", 0.8);
    g.append("circle").attr("cx", xScale(nLast.year)).attr("cy", yRight(nLast.value))
      .attr("r", 6).attr("fill", "#b85c70").attr("stroke", "#fff").attr("stroke-width", 2)
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 500).attr("opacity", 1);
    g.append("text").attr("x", xScale(nLast.year) - 50).attr("y", yRight(nLast.value) + 28)
      .attr("fill", "#b85c70").attr("font-size", "16px").attr("font-weight", "700")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif").text("NRW " + nLast.value.toFixed(0) + "%")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 700).attr("opacity", 1);
    g.append("text").attr("x", xScale(nLast.year) + 5).attr("y", yRight(nLast.value) + 45)
      .attr("fill", "#b85c70").attr("font-size", "24px").text("\u2191")
      .attr("opacity", 0).transition().duration(400).delay(TRANSITION_MS + 800).attr("opacity", 0.8);

    // Legend
    const legendData = [
      { label: "SSA Tariff (left axis)", color: "#1a3a5c", dashed: false },
      { label: "SSA Non-Revenue Water (right axis)", color: "#b85c70", dashed: false },
      { label: "Global NRW (right axis)", color: "#b85c70", dashed: true },
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
      .attr("fill", "#f8f5f0").attr("stroke", "#b85c70").attr("stroke-width", 1).attr("stroke-opacity", 0.3);
    insightG.append("text").attr("x", 14).attr("y", 23)
      .attr("fill", "#282c34").attr("font-size", "14px").attr("font-weight", "500")
      .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
      .text("Tariff revenue is not being invested in reducing water losses : the system is leaking money");
    insightG.transition().duration(600).delay(TRANSITION_MS + 1000).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // DISPATCH
  // ═══════════════════════════════════════════════════════════
  const RENDERERS = {
    tariffs: renderTariffs,
    "tariffs-nominal": renderTariffsNominal,
    nrw: renderNRWBubble,
    metering: renderMetering,
    "cost-coverage": renderCostCoverage,
    paradox: renderParadox,
    affordability: renderAffordability,
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
