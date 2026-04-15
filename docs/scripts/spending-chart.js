/**
 * Spending Gaps (choropleth map) + Budget Execution (stacked bars)
 * D3.js renderers for slides 8 and 9.
 */
(function () {
  "use strict";

  const FONT = "'Nunito', -apple-system, sans-serif";
  const FONT_H = "'Playfair Display', Georgia, serif";
  const BG = "#f8f5f0";

  // ═══════════════════════════════════════════════════════════
  // SPENDING GAPS — Choropleth map with callout badges
  // ═══════════════════════════════════════════════════════════
  async function renderSpendingGaps() {
    var container = document.getElementById("chart-spending-gaps");
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";
    container.innerHTML = "";

    var world, gapData;
    try {
      var results = await Promise.all([
        fetch("data/world.json").then(function(r) { return r.json(); }),
        fetch("data/spending_gaps.json?v=3").then(function(r) { return r.json(); }),
      ]);
      world = results[0];
      gapData = results[1];
    } catch (e) { return; }
    if (!world || !world.features) return;

    // Same pattern as tb-chart.js (which renders world.json successfully)
    var W = 960, H = 540;
    var MAP_H = 420;

    var svg = d3.select(container)
      .append("svg")
      .attr("viewBox", "0 0 " + W + " " + H)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block")
      .style("background", BG);

    // Title
    svg.append("text").attr("x", 30).attr("y", 28)
      .attr("fill", "#8b1a2d").attr("font-size", "22px").attr("font-weight", "900")
      .attr("font-family", FONT_H).text("The Water Sector Spending Gap");
    svg.append("text").attr("x", 30).attr("y", 46)
      .attr("fill", "#4a5568").attr("font-size", "11px")
      .attr("font-family", FONT)
      .text("Annual investment gap by region (USD billions) to achieve universal access by 2030");

    // Total callout
    svg.append("text").attr("x", W - 30).attr("y", 28)
      .attr("text-anchor", "end")
      .attr("fill", "#1a3a5c").attr("font-size", "18px").attr("font-weight", "900")
      .attr("font-family", FONT_H).text("$" + gapData.total + " billion");
    svg.append("text").attr("x", W - 30).attr("y", 44)
      .attr("text-anchor", "end")
      .attr("fill", "#6b7280").attr("font-size", "10px")
      .attr("font-family", FONT).text("total annual gap");

    // Clip
    svg.append("defs").append("clipPath").attr("id", "clip-spending")
      .append("rect").attr("width", W).attr("height", H);
    var mapG = svg.append("g")
      .attr("transform", "translate(0, 55)")
      .attr("clip-path", "url(#clip-spending)");

    // Projection (same as tb-chart.js)
    var projection = d3.geoNaturalEarth1()
      .scale(195)
      .center([10, 15])
      .translate([W / 2, MAP_H / 2]);
    var pathGen = d3.geoPath().projection(projection);

    // Region colors - high contrast, very saturated
    var REGION_FILL = {
      "AFR": "#a31d2f",
      "SOA": "#e85d8a",
      "LCR": "#f4a261",
      "MENA": "#2a9d8f",
      "ECA": "#264653",
      "EAP": "#e76f51",
      "Other": "#eee8e0",
    };

    // Ocean
    mapG.append("path")
      .datum({ type: "Sphere" })
      .attr("d", pathGen)
      .attr("fill", "#dfe9f0")
      .attr("stroke", "#c8d8e4")
      .attr("stroke-width", 0.5);

    // Countries (same pattern as tb-chart.js)
    mapG.selectAll("path.country")
      .data(world.features)
      .enter().append("path")
      .attr("class", "country")
      .attr("d", pathGen)
      .attr("fill", function (d) {
        return REGION_FILL[d.properties.region] || "#eee8e0";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4);

    // Callout badges
    gapData.regions.forEach(function (r, i) {
      var projected = projection(r.centroid);
      if (!projected) return;
      var bx = projected[0], by = projected[1] + 55;

      var badge = svg.append("g")
        .attr("transform", "translate(" + bx + "," + by + ")")
        .attr("opacity", 0);

      badge.append("rect")
        .attr("x", -58).attr("y", -18)
        .attr("width", 116).attr("height", 36)
        .attr("rx", 5).attr("ry", 5)
        .attr("fill", "#1a3a5c")
        .attr("fill-opacity", 0.92);

      badge.append("text")
        .attr("y", -1)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff").attr("font-size", "12px")
        .attr("font-weight", "800").attr("font-family", FONT)
        .text("$" + r.gap + " billion");

      badge.append("text")
        .attr("y", 13)
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(255,255,255,0.7)").attr("font-size", "9px")
        .attr("font-weight", "600").attr("font-family", FONT)
        .text(r.label);

      badge.transition().duration(600).delay(400 + i * 150).attr("opacity", 1);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // BUDGET EXECUTION — Vertical stacked bars
  // ═══════════════════════════════════════════════════════════
  function renderBudgetExecution() {
    var container = document.getElementById("chart-budget-execution");
    if (!container) return;
    container.innerHTML = "";

    var W = 1920, H = 900;
    var MARGIN = { top: 100, right: 200, bottom: 100, left: 100 };
    var width = W - MARGIN.left - MARGIN.right;
    var height = H - MARGIN.top - MARGIN.bottom;

    var sectors = [
      { label: "Human\nDevelopment", executed: 99, color: "#1a3a5c", unspentColor: "#8da8be" },
      { label: "Transport",          executed: 91, color: "#2e6da4", unspentColor: "#a5bdd6" },
      { label: "Agriculture",        executed: 89, color: "#8b1a2d", unspentColor: "#c9a0a8" },
      { label: "Water",              executed: 72, color: "#b85c70", unspentColor: "#e8b4c0", highlight: true },
    ];

    var svg = d3.select(container).append("svg")
      .attr("viewBox", "0 0 " + W + " " + H)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%").style("height", "100%");

    // Title
    svg.append("text").attr("x", MARGIN.left).attr("y", 42)
      .attr("fill", "#8b1a2d").attr("font-size", "36px").attr("font-weight", "900")
      .attr("font-family", FONT_H).text("Water Has the Lowest Budget Execution Rate");
    svg.append("text").attr("x", MARGIN.left).attr("y", 76)
      .attr("fill", "#4a5568").attr("font-size", "20px")
      .attr("font-family", FONT)
      .text("Share of approved budget actually spent, by sector (World Bank portfolio)");

    var g = svg.append("g").attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

    var xBand = d3.scaleBand()
      .domain(sectors.map(function (d, i) { return i; }))
      .range([0, width])
      .padding(0.35);

    var yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    // Y gridlines
    [0, 25, 50, 75, 100].forEach(function (v) {
      g.append("line")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", yScale(v)).attr("y2", yScale(v))
        .attr("stroke", v === 100 ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.08)")
        .attr("stroke-dasharray", v < 100 ? "4,3" : "none");
      g.append("text")
        .attr("x", -12).attr("y", yScale(v) + 4)
        .attr("text-anchor", "end")
        .attr("fill", "#6b7280").attr("font-size", "16px")
        .attr("font-family", FONT).text(v + "%");
    });

    // Bars
    sectors.forEach(function (d, i) {
      var x = xBand(i);
      var bw = xBand.bandwidth();
      var execH = height * (d.executed / 100);
      var unspentH = height - execH;

      // Unspent portion (top, lighter)
      g.append("rect")
        .attr("x", x).attr("y", 0)
        .attr("width", bw).attr("height", 0)
        .attr("rx", 3).attr("fill", d.unspentColor)
        .transition().duration(800).delay(200 + i * 120)
        .attr("height", unspentH);

      // Executed portion (bottom, darker)
      g.append("rect")
        .attr("x", x).attr("y", height)
        .attr("width", bw).attr("height", 0)
        .attr("rx", 3).attr("fill", d.color)
        .transition().duration(800).delay(200 + i * 120)
        .attr("y", yScale(d.executed))
        .attr("height", execH);

      // Highlight outline for water
      if (d.highlight) {
        g.append("rect")
          .attr("x", x - 2).attr("y", 0)
          .attr("width", bw + 4).attr("height", height)
          .attr("rx", 5).attr("fill", "none")
          .attr("stroke", d.color).attr("stroke-width", 3)
          .attr("stroke-dasharray", "8,4")
          .attr("opacity", 0)
          .transition().duration(400).delay(1200)
          .attr("opacity", 0.6);
      }

      // Executed % label inside bar
      g.append("text")
        .attr("x", x + bw / 2).attr("y", yScale(d.executed / 2))
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "#fff").attr("font-size", "28px").attr("font-weight", "700")
        .attr("font-family", FONT).text(d.executed + "%")
        .attr("opacity", 0)
        .transition().duration(400).delay(600 + i * 120)
        .attr("opacity", 0.95);

      // Unspent label
      if (d.executed < 95) {
        g.append("text")
          .attr("x", x + bw / 2).attr("y", unspentH / 2)
          .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
          .attr("fill", "#4a5568").attr("font-size", "18px").attr("font-weight", "600")
          .attr("font-family", FONT).text((100 - d.executed) + "% unspent")
          .attr("opacity", 0)
          .transition().duration(400).delay(800 + i * 120)
          .attr("opacity", 0.7);
      }

      // Sector label (below)
      var lines = d.label.split("\n");
      lines.forEach(function (line, li) {
        g.append("text")
          .attr("x", x + bw / 2).attr("y", height + 30 + li * 24)
          .attr("text-anchor", "middle")
          .attr("fill", d.highlight ? d.color : "#282c34")
          .attr("font-size", "22px")
          .attr("font-weight", d.highlight ? "800" : "600")
          .attr("font-family", FONT).text(line);
      });
    });

    // Legend
    var legG = svg.append("g").attr("transform", "translate(" + (MARGIN.left + width + 40) + "," + (MARGIN.top + 20) + ")");
    legG.append("rect").attr("width", 18).attr("height", 18).attr("rx", 3).attr("fill", "#1a3a5c");
    legG.append("text").attr("x", 26).attr("y", 14).attr("fill", "#4a5568")
      .attr("font-size", "16px").attr("font-family", FONT).text("Executed");
    legG.append("rect").attr("y", 28).attr("width", 18).attr("height", 18).attr("rx", 3).attr("fill", "#8da8be");
    legG.append("text").attr("x", 26).attr("y", 42).attr("fill", "#4a5568")
      .attr("font-size", "16px").attr("font-family", FONT).text("Unspent");
  }

  // ═══════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════
  (function () {
    function setup() {
      Reveal.on("slidechanged", function (ev) {
        if (ev.currentSlide.id === "spending-gap") renderSpendingGaps();
        if (ev.currentSlide.id === "budget-execution") renderBudgetExecution();
      });
      var curr = Reveal.getCurrentSlide();
      if (curr && curr.id === "spending-gap") renderSpendingGaps();
      if (curr && curr.id === "budget-execution") renderBudgetExecution();
    }
    if (typeof Reveal !== "undefined" && Reveal.isReady && Reveal.isReady()) setup();
    else if (typeof Reveal !== "undefined") Reveal.on("ready", setup);
    else document.addEventListener("DOMContentLoaded", function () { setTimeout(setup, 500); });
  })();
})();
