/**
 * Continental Drying Charts — D3.js
 *
 * Three charts from the WB Continental Drying report:
 * 1. Freshwater loss time series (area + line)
 * 2. Land use impact coefficients (horizontal bars + CI)
 * 3. Electricity-TWS relationship (smooth curve + ribbon)
 */

(function () {
  "use strict";

  const TRANSITION_MS = 1200;
  const FONT = "-apple-system, BlinkMacSystemFont, sans-serif";
  const COLOR_LOSS = "#8b1a2d";
  const COLOR_GAIN = "#1a3a5c";
  const COLOR_STEEL = "#2e6da4";
  const COLOR_GRAY = "#9ca3af";

  let cdData = {};
  let dataLoaded = false;

  async function loadCDData() {
    if (dataLoaded) return;
    const [freshwater, landUse, electricity] = await Promise.all([
      fetch("data/cd_freshwater_loss.json").then((r) => r.json()),
      fetch("data/cd_land_use.json").then((r) => r.json()),
      fetch("data/cd_electricity_tws.json").then((r) => r.json()),
    ]);
    cdData = { freshwater, landUse, electricity };
    dataLoaded = true;
  }

  function getDimensions(container) {
    const slideW = Reveal.getConfig().width || 1920;
    const slideH = Reveal.getConfig().height || 1080;
    const W = slideW * 0.92;
    // Use container's actual height if available, else fallback
    let H = slideH * 0.72;
    if (container) {
      const rect = container.getBoundingClientRect();
      const slide = container.closest('section');
      if (slide) {
        const slideRect = slide.getBoundingClientRect();
        const scale = slideW / slideRect.width;
        H = rect.height * scale;
      }
    }
    return { W, H, slideW, slideH };
  }

  // ═══════════════════════════════════════════════════════════
  // CHART A: Freshwater Loss Time Series
  // ═══════════════════════════════════════════════════════════
  function renderFreshwaterLoss() {
    const container = document.getElementById("chart-freshwater-loss");
    if (!container) return;
    const data = cdData.freshwater;
    if (!data) return;

    const { W, H } = getDimensions(container);
    const MARGIN = { top: 90, right: 80, bottom: 80, left: 110 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const parsed = data.map((d) => ({
      date: new Date(d.time),
      loss: d.loss,
    }));

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const xScale = d3
      .scaleTime()
      .domain([new Date("2002-05-01"), new Date("2024-04-01")])
      .range([0, width]);
    const yScale = d3.scaleLinear().domain([-2000, 8000]).range([height, 0]);

    // Horizontal gridlines
    g.append("g")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(0,0,0,0.06)");

    // Zero line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "rgba(0,0,0,0.2)")
      .attr("stroke-width", 1.5);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(d3.timeYear.every(2)).tickFormat(d3.timeFormat("%Y")))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", "14px");
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(",d")))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", "14px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Y label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -75)
      .attr("text-anchor", "middle")
      .attr("fill", "#4a5568")
      .attr("font-size", "15px")
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .text("Freshwater loss (km³/yr)");

    // Title
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 32)
      .attr("fill", "#282c34")
      .attr("font-size", "26px")
      .attr("font-weight", "700")
      .attr("font-family", FONT)
      .text("Terrestrial Freshwater Storage Loss to Oceans");
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 58)
      .attr("fill", "#4a5568")
      .attr("font-size", "16px")
      .attr("font-family", FONT)
      .text("Monthly, May 2002 – April 2024 (gap: GRACE satellite data interruption)");

    // Area
    const area = d3
      .area()
      .defined((d) => d.loss !== null)
      .x((d) => xScale(d.date))
      .y0(yScale(0))
      .y1((d) => yScale(d.loss))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(parsed)
      .attr("d", area)
      .attr("fill", COLOR_STEEL)
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .delay(400)
      .attr("opacity", 0.25);

    // Line
    const line = d3
      .line()
      .defined((d) => d.loss !== null)
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.loss))
      .curve(d3.curveMonotoneX);

    const linePath = g
      .append("path")
      .datum(parsed)
      .attr("fill", "none")
      .attr("stroke", COLOR_STEEL)
      .attr("stroke-width", 2)
      .attr("d", line);
    const totalLength = linePath.node().getTotalLength();
    linePath
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1800)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        d3.select(this).attr("stroke-dasharray", "none");
      });

    // End-point callout
    const last = parsed.filter((d) => d.loss !== null).slice(-1)[0];
    if (last) {
      const endG = g.append("g").attr("opacity", 0);
      endG
        .append("circle")
        .attr("cx", xScale(last.date))
        .attr("cy", yScale(last.loss))
        .attr("r", 6)
        .attr("fill", COLOR_LOSS)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
      endG
        .append("text")
        .attr("x", xScale(last.date) - 10)
        .attr("y", yScale(last.loss) - 16)
        .attr("text-anchor", "end")
        .attr("fill", COLOR_LOSS)
        .attr("font-size", "18px")
        .attr("font-weight", "700")
        .attr("font-family", FONT)
        .text(d3.format(",")(Math.round(last.loss)) + " km³/yr");
      endG.transition().duration(600).delay(1800).attr("opacity", 1);
    }

    // Insight bar
    const insightG = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 55})`)
      .attr("opacity", 0);
    insightG
      .append("rect")
      .attr("width", width * 0.7)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#f0e8e4")
      .attr("stroke", "#1a3a5c")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);
    insightG
      .append("text")
      .attr("x", 14)
      .attr("y", 23)
      .attr("fill", "#282c34")
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .text("From near-zero to 7,400+ km³/yr of annual freshwater loss in just 22 years");
    insightG.transition().duration(600).delay(2200).attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // CHART B: Land Use Impact Coefficients
  // ═══════════════════════════════════════════════════════════
  function renderLandUse() {
    const container = document.getElementById("chart-land-use-tws");
    if (!container) return;
    const data = cdData.landUse;
    if (!data) return;

    const { W, H } = getDimensions(container);
    const MARGIN = { top: 90, right: 100, bottom: 60, left: 240 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.variable))
      .range([0, height])
      .padding(0.35);
    const xScale = d3.scaleLinear().domain([-1.0, 0.4]).range([0, width]);

    // Gridlines
    g.append("g")
      .selectAll("line")
      .data(xScale.ticks(7))
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "rgba(0,0,0,0.06)");

    // Zero line
    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", -10)
      .attr("y2", height + 10)
      .attr("stroke", "rgba(200,0,0,0.4)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "6,4");

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(7))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", "14px");
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#4a5568")
      .attr("font-size", "15px")
      .attr("font-weight", "500");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Title
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 32)
      .attr("fill", "#282c34")
      .attr("font-size", "26px")
      .attr("font-weight", "700")
      .attr("font-family", FONT)
      .text("Impact of 1% Change in Land Use on TWS Trends (2003–24)");
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 58)
      .attr("fill", "#4a5568")
      .attr("font-size", "16px")
      .attr("font-family", FONT)
      .text("Coefficients with 95% confidence intervals, relative to barren land baseline");

    // Bars (animate from zero line)
    const bars = g
      .selectAll(".cd-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "cd-bar")
      .attr("y", (d) => yScale(d.variable))
      .attr("height", yScale.bandwidth())
      .attr("x", xScale(0))
      .attr("width", 0)
      .attr("rx", 3)
      .attr("fill", (d) => (d.coeff < 0 ? COLOR_LOSS : d.coeff > 0 ? COLOR_GAIN : COLOR_GRAY));

    bars
      .transition()
      .duration(800)
      .delay((d, i) => i * 150)
      .ease(d3.easeCubicOut)
      .attr("x", (d) => (d.coeff < 0 ? xScale(d.coeff) : xScale(0)))
      .attr("width", (d) => Math.abs(xScale(d.coeff) - xScale(0)));

    // Error bars
    data.forEach((d, i) => {
      if (d.ci_lower === null || d.ci_upper === null) return;
      const cy = yScale(d.variable) + yScale.bandwidth() / 2;
      const errG = g.append("g").attr("opacity", 0);

      // Horizontal line
      errG
        .append("line")
        .attr("x1", xScale(d.ci_lower))
        .attr("x2", xScale(d.ci_upper))
        .attr("y1", cy)
        .attr("y2", cy)
        .attr("stroke", "#282c34")
        .attr("stroke-width", 1.5);
      // Caps
      const capH = 8;
      [d.ci_lower, d.ci_upper].forEach((v) => {
        errG
          .append("line")
          .attr("x1", xScale(v))
          .attr("x2", xScale(v))
          .attr("y1", cy - capH)
          .attr("y2", cy + capH)
          .attr("stroke", "#282c34")
          .attr("stroke-width", 1.5);
      });

      errG
        .transition()
        .duration(400)
        .delay(800 + i * 150 + 200)
        .attr("opacity", 1);
    });

    // Value labels
    data.forEach((d, i) => {
      if (d.coeff === 0) return;
      const labelX = d.coeff < 0 ? xScale(d.coeff) - 10 : xScale(d.coeff) + 10;
      const anchor = d.coeff < 0 ? "end" : "start";
      g.append("text")
        .attr("x", labelX)
        .attr("y", yScale(d.variable) + yScale.bandwidth() / 2 + 5)
        .attr("text-anchor", anchor)
        .attr("fill", d.coeff < 0 ? COLOR_LOSS : COLOR_GAIN)
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("font-family", FONT)
        .text((d.coeff > 0 ? "+" : "") + d.coeff.toFixed(2))
        .attr("opacity", 0)
        .transition()
        .duration(400)
        .delay(800 + i * 150 + 300)
        .attr("opacity", 1);
    });

    // Directional labels
    g.append("text")
      .attr("x", xScale(-0.5))
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("fill", COLOR_LOSS)
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("font-family", FONT)
      .text("← Water loss");
    g.append("text")
      .attr("x", xScale(0.2))
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("fill", COLOR_GAIN)
      .attr("font-size", "13px")
      .attr("font-weight", "600")
      .attr("font-family", FONT)
      .text("Water retention →");

    // Insight bar
    const insightG = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${H - 45})`)
      .attr("opacity", 0);
    insightG
      .append("rect")
      .attr("width", width * 0.72)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#f0e8e4")
      .attr("stroke", "#1a3a5c")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3);
    insightG
      .append("text")
      .attr("x", 14)
      .attr("y", 23)
      .attr("fill", "#282c34")
      .attr("font-size", "14px")
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .text("Urban expansion and irrigation are the biggest drivers of freshwater depletion");
    insightG
      .transition()
      .duration(600)
      .delay(800 + data.length * 150 + 500)
      .attr("opacity", 1);
  }

  // ═══════════════════════════════════════════════════════════
  // CHART C: Electricity-TWS Relationship
  // ═══════════════════════════════════════════════════════════
  function renderElectricityTWS(containerId) {
    const container = document.getElementById(containerId || "chart-energy-tws");
    if (!container) return;
    const data = cdData.electricity;
    if (!data) return;

    const { W, H } = getDimensions(container);
    const MARGIN = { top: 90, right: 80, bottom: 80, left: 110 };
    container.innerHTML = "";
    const width = W - MARGIN.left - MARGIN.right;
    const height = H - MARGIN.top - MARGIN.bottom;

    const svg = d3.select(container).append("svg").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const xScale = d3.scaleLinear().domain([-150, 155]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-45, 45]).range([height, 0]);

    // Gridlines
    g.append("g")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(0,0,0,0.06)");

    // Zero lines
    g.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "rgba(200,0,0,0.35)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "6,4");
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "rgba(200,0,0,0.35)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "6,4");

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(7))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", "20px");
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll("text")
      .attr("fill", "#6b7280")
      .attr("font-size", "20px");
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.1)");

    // Axis labels
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60)
      .attr("text-anchor", "middle")
      .attr("fill", "#4a5568")
      .attr("font-size", "20px")
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .text("Energy price, residualized (% change)");
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -80)
      .attr("text-anchor", "middle")
      .attr("fill", "#4a5568")
      .attr("font-size", "20px")
      .attr("font-weight", "500")
      .attr("font-family", FONT)
      .text("Depth of terrestrial water storage (mm)");

    // Title
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 36)
      .attr("fill", "#282c34")
      .attr("font-size", "30px")
      .attr("font-weight", "700")
      .attr("font-family", FONT)
      .text("Impact of Energy Pricing on Terrestrial Water Storage");
    svg
      .append("text")
      .attr("x", MARGIN.left)
      .attr("y", 64)
      .attr("fill", "#4a5568")
      .attr("font-size", "20px")
      .attr("font-family", FONT)
      .text("In irrigation-intensive countries (local polynomial smoothed)");

    // Confidence ribbon
    const area = d3
      .area()
      .x((d) => xScale(d.x))
      .y0((d) => yScale(d.ci_lower))
      .y1((d) => yScale(d.ci_upper))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("d", area)
      .attr("fill", COLOR_STEEL)
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .attr("opacity", 0.2);

    // Smooth line
    const line = d3
      .line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    const linePath = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", COLOR_STEEL)
      .attr("stroke-width", 2.5)
      .attr("d", line);
    const totalLength = linePath.node().getTotalLength();
    linePath
      .attr("stroke-dasharray", totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(TRANSITION_MS)
      .delay(300)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        d3.select(this).attr("stroke-dasharray", "none");
      });

    // Quadrant annotations
    const annoDelay = TRANSITION_MS + 700;

    // Top-right: high prices → more water
    const trG = g.append("g").attr("opacity", 0);
    trG
      .append("rect")
      .attr("x", xScale(55))
      .attr("y", yScale(42))
      .attr("width", 300)
      .attr("height", 52)
      .attr("rx", 6)
      .attr("fill", "#fff")
      .attr("stroke", COLOR_GAIN)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.4);
    trG
      .append("text")
      .attr("x", xScale(55) + 14)
      .attr("y", yScale(42) + 22)
      .attr("fill", COLOR_GAIN)
      .attr("font-size", "17px")
      .attr("font-weight", "600")
      .attr("font-family", FONT)
      .text("High electricity prices");
    trG
      .append("text")
      .attr("x", xScale(55) + 14)
      .attr("y", yScale(42) + 42)
      .attr("fill", COLOR_GAIN)
      .attr("font-size", "15px")
      .attr("font-family", FONT)
      .text("→ Increase in freshwater availability");
    trG.transition().duration(600).delay(annoDelay).attr("opacity", 1);

    // Bottom-left: low prices → less water
    const blG = g.append("g").attr("opacity", 0);
    blG
      .append("rect")
      .attr("x", xScale(-145))
      .attr("y", yScale(-28))
      .attr("width", 300)
      .attr("height", 52)
      .attr("rx", 6)
      .attr("fill", "#fff")
      .attr("stroke", COLOR_LOSS)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.4);
    blG
      .append("text")
      .attr("x", xScale(-145) + 14)
      .attr("y", yScale(-28) + 22)
      .attr("fill", COLOR_LOSS)
      .attr("font-size", "17px")
      .attr("font-weight", "600")
      .attr("font-family", FONT)
      .text("Low electricity prices");
    blG
      .append("text")
      .attr("x", xScale(-145) + 14)
      .attr("y", yScale(-28) + 42)
      .attr("fill", COLOR_LOSS)
      .attr("font-size", "15px")
      .attr("font-family", FONT)
      .text("→ Decrease in freshwater availability");
    blG.transition().duration(600).delay(annoDelay + 200).attr("opacity", 1);

  }

  // ═══════════════════════════════════════════════════════════
  // Initialization — Reveal.js slidechanged listener
  // ═══════════════════════════════════════════════════════════
  const RENDERERS = {
    "freshwater-loss": renderFreshwaterLoss,
    "land-use-tws": renderLandUse,
    "energy-tws": function() { renderElectricityTWS("chart-energy-tws"); },
    "energy-pricing": function() { renderElectricityTWS("chart-energy-pricing"); },
    "ag-pricing": function() { renderElectricityTWS("chart-energy-pricing"); },
  };

  async function handleSlide(id) {
    if (RENDERERS[id]) {
      await loadCDData();
      RENDERERS[id]();
    }
  }

  // Listen for robust dispatch from inline script
  document.addEventListener("cd-render", async (e) => {
    await loadCDData();
    const id = e.detail.slide;
    if (RENDERERS[id]) RENDERERS[id]();
  });

  (function setupCD() {
    if (typeof Reveal === "undefined") {
      document.addEventListener("DOMContentLoaded", function() { setTimeout(setupCD, 300); });
      return;
    }
    function register() {
      Reveal.on("slidechanged", (event) => {
        handleSlide(event.currentSlide.id || "");
      });
      const slide = Reveal.getCurrentSlide();
      if (slide) handleSlide(slide.id || "");
    }
    if (Reveal.isReady && Reveal.isReady()) register();
    else Reveal.on("ready", register);
  })();
})();
