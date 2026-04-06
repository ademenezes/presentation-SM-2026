/**
 * Triple Burden — D3 map-to-chart morph using flubber
 *
 * On slide entry: renders a choropleth map colored by dominant burden.
 * On fragment advance (arrow/click): each country shape morphs into
 * its target rectangle in a horizontal stacked bar chart.
 */

(function () {
  "use strict";

  const FONT = "-apple-system, BlinkMacSystemFont, sans-serif";

  const SEGMENT_KEYS = ["three", "two", "one", "none", "noData"];
  const SEGMENT_COLORS = {
    three: "#a50026", two: "#f46d43", one: "#f1eebc",
    none: "#e4efff", noData: "#eaeaea"
  };
  const SEGMENT_LABELS = {
    three: "Three burdens", two: "Two burdens", one: "One burden",
    none: "No burdens", noData: "No data"
  };
  const DOM_TO_SEG = { 3: "three", 2: "two", 1: "one", 0: "none" };

  const REGION_ORDER = [
    "Sub-Saharan Africa", "South Asia", "East Asia & Pacific",
    "Latin America & Caribbean",
    "Middle East, North Africa, Afghanistan & Pakistan",
    "Europe & Central Asia"
  ];
  const REGION_SHORT = {
    "Sub-Saharan Africa": "Sub-Saharan Africa",
    "South Asia": "South Asia",
    "East Asia & Pacific": "East Asia & Pacific",
    "Latin America & Caribbean": "Latin America & Caribbean",
    "Middle East, North Africa, Afghanistan & Pakistan": "Middle East & North Africa",
    "Europe & Central Asia": "Europe & Central Asia"
  };

  let datasets = null;
  async function loadAll() {
    if (datasets) return datasets;
    const [world, countries, tbData] = await Promise.all([
      fetch("data/world.json").then(r => r.json()),
      fetch("data/tb_data_countries.json").then(r => r.json()),
      fetch("data/tb_data.json").then(r => r.json()),
    ]);
    datasets = { world, countries, tbData };
    return datasets;
  }

  // Build a rect path string for flubber target
  function rectPath(x, y, w, h) {
    return `M${x},${y}L${x + w},${y}L${x + w},${y + h}L${x},${y + h}Z`;
  }

  // ═══════════════════════════════════════════════════════════
  // MORPH SLIDE
  // ═══════════════════════════════════════════════════════════
  async function initMorphSlide(sector, containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.querySelector("svg")) return;

    const data = await loadAll();
    const countryBurdens = data.countries[sector];
    const regionData = data.tbData.regions[sector];

    // Parse geometry
    let geo;
    if (data.world.type === "Topology" && data.world.objects) {
      geo = topojson.feature(data.world, data.world.objects.countries || Object.values(data.world.objects)[0]);
    } else {
      geo = data.world;
    }

    const W = 1760, H = 820;
    const svg = d3.select("#" + containerId)
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // ── MAP ─────────────────────────────────────────────────
    const projection = d3.geoNaturalEarth1().fitSize([W - 40, H - 80], geo);
    const pathGen = d3.geoPath().projection(projection);

    // Clip to sphere (fixes antimeridian-spanning countries)
    const clipId = "clip-" + containerId;
    svg.append("defs").append("clipPath").attr("id", clipId)
      .append("path").datum({ type: "Sphere" }).attr("d", pathGen);

    // Ocean
    svg.append("path").datum({ type: "Sphere" }).attr("d", pathGen)
      .attr("fill", "#d0e2f2").attr("stroke", "#a8c4de").attr("stroke-width", 1)
      .attr("class", "tb-ocean");

    // Country group (clipped)
    const mapG = svg.append("g").attr("clip-path", `url(#${clipId})`);

    // For each country, determine its color from TB data
    function getCountryColor(feature) {
      const iso = feature.properties.iso3 || feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.id;
      const cb = countryBurdens[iso];
      if (!cb || cb.dominant === -9 || cb.dominant === undefined) return SEGMENT_COLORS.noData;
      return SEGMENT_COLORS[DOM_TO_SEG[cb.dominant]] || SEGMENT_COLORS.noData;
    }

    function getCountrySegment(feature) {
      const iso = feature.properties.iso3 || feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.id;
      const cb = countryBurdens[iso];
      if (!cb || cb.dominant === -9 || cb.dominant === undefined) return "noData";
      return DOM_TO_SEG[cb.dominant] || "noData";
    }

    function getCountryRegion(feature) {
      const iso = feature.properties.iso3 || feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.id;
      const cb = countryBurdens[iso];
      return cb ? cb.region : null;
    }

    const countryPaths = mapG.selectAll("path.tb-country")
      .data(geo.features)
      .enter().append("path")
      .attr("class", "tb-country")
      .attr("d", pathGen)
      .attr("fill", d => getCountryColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.6);

    // Legend
    const legendG = svg.append("g").attr("class", "tb-legend")
      .attr("transform", `translate(${W / 2 - 320}, ${H - 22})`);
    let lx = 0;
    SEGMENT_KEYS.forEach(seg => {
      legendG.append("rect").attr("x", lx).attr("y", 0)
        .attr("width", 14).attr("height", 14).attr("rx", 2)
        .attr("fill", SEGMENT_COLORS[seg]);
      const t = legendG.append("text").attr("x", lx + 19).attr("y", 11)
        .attr("fill", "#4a5568").attr("font-size", "13px")
        .attr("font-family", FONT).text(SEGMENT_LABELS[seg]);
      lx += (t.node().getComputedTextLength() || 80) + 28;
    });

    // ── BAR CHART LAYOUT (pre-computed) ─────────────────────
    const MARGIN = { top: 20, right: 110, bottom: 50, left: 300 };
    const chartW = W - MARGIN.left - MARGIN.right;
    const chartH = H - MARGIN.top - MARGIN.bottom - 40;

    const yScale = d3.scaleBand()
      .domain(REGION_ORDER.map(r => REGION_SHORT[r]))
      .range([0, chartH]).padding(0.25);

    const xScale = d3.scaleLinear().domain([0, 100]).range([0, chartW]);

    // Pre-compute target rects for each (region, segment) combo
    const targetRects = {};
    regionData.forEach((rd, ri) => {
      const label = REGION_SHORT[REGION_ORDER[ri]];
      const barY = yScale(label) + MARGIN.top;
      const barH = yScale.bandwidth();
      let cumX = 0;
      SEGMENT_KEYS.forEach(seg => {
        const val = rd[seg] || 0;
        if (val <= 0) return;
        const rx = MARGIN.left + xScale(cumX);
        const rw = xScale(val);
        targetRects[REGION_ORDER[ri] + "|" + seg] = { x: rx, y: barY, w: rw, h: barH };
        cumX += val;
      });
    });

    // ── MORPH FUNCTION ──────────────────────────────────────
    let morphed = false;

    function morphToChart() {
      if (morphed) return;
      morphed = true;

      // Fade ocean
      svg.select(".tb-ocean").transition().duration(800).attr("opacity", 0);

      // Remove clip so morphing paths aren't cut
      mapG.attr("clip-path", null);

      // Morph each country shape → target bar rect
      countryPaths.each(function (d) {
        const el = d3.select(this);
        const seg = getCountrySegment(d);
        const region = getCountryRegion(d);
        const key = region + "|" + seg;
        const target = targetRects[key];

        if (!target) {
          // No matching bar segment (unknown region) → just fade out
          el.transition().duration(800).delay(Math.random() * 400)
            .attr("opacity", 0);
          return;
        }

        // Get current path string
        const currentPath = el.attr("d");
        if (!currentPath || currentPath.length < 5) {
          el.transition().duration(600).attr("opacity", 0);
          return;
        }

        // Morph to the full bar segment rectangle
        const tPath = rectPath(target.x, target.y, target.w, target.h);

        // Use flubber to interpolate
        let interpolator;
        try {
          interpolator = flubber.interpolate(currentPath, tPath, { maxSegmentLength: 10 });
        } catch (e) {
          // Fallback: just move and shrink
          el.transition().duration(1200).delay(Math.random() * 600)
            .attr("transform", `translate(${target.x + target.w / 2},${target.y + target.h / 2}) scale(0.01)`)
            .attr("opacity", 0);
          return;
        }

        // Stagger by region for a structured "collapse" effect
        const regionIdx = REGION_ORDER.indexOf(region);
        const delay = 100 + (regionIdx >= 0 ? regionIdx * 120 : 0) + Math.random() * 200;

        // Remove stroke during morph for cleaner look
        el.transition().duration(1200).delay(delay)
          .attrTween("d", () => interpolator)
          .attr("stroke-width", 0)
          .attr("fill", SEGMENT_COLORS[seg]);
      });

      // After morph: overlay clean bar segments + labels
      const chartG = svg.append("g").attr("class", "tb-bars").attr("opacity", 0);

      // Y axis labels
      REGION_ORDER.forEach((region, i) => {
        const label = REGION_SHORT[region];
        chartG.append("text")
          .attr("x", MARGIN.left - 14)
          .attr("y", yScale(label) + MARGIN.top + yScale.bandwidth() / 2)
          .attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", i === 0 ? "#1a1a2e" : "#4a5568")
          .attr("font-size", "17px")
          .attr("font-weight", i === 0 ? "700" : "400")
          .attr("font-family", FONT).text(label);
      });

      // X axis
      const xAxisG = chartG.append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top + chartH})`);
      xAxisG.call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"));
      xAxisG.select(".domain").remove();
      xAxisG.selectAll("text").attr("fill", "#8898aa").attr("font-size", "13px");

      // Clean bar outlines + percentage labels
      regionData.forEach((rd, ri) => {
        const label = REGION_SHORT[REGION_ORDER[ri]];
        const barY = yScale(label) + MARGIN.top;
        const barH = yScale.bandwidth();
        let cumX = 0;

        SEGMENT_KEYS.forEach((seg, si) => {
          const val = rd[seg] || 0;
          if (val <= 0) return;
          const bx = MARGIN.left + xScale(cumX);
          const bw = xScale(val);
          cumX += val;

          // Semi-transparent overlay rect for clean edges
          chartG.append("rect")
            .attr("x", bx).attr("y", barY)
            .attr("width", bw).attr("height", barH)
            .attr("fill", "none")
            .attr("stroke", "#fff").attr("stroke-width", 1.5)
            .attr("rx", si === 0 ? 4 : 0);

          // Percentage labels
          if ((seg === "three" || seg === "two") && val >= 5) {
            chartG.append("text")
              .attr("x", bx + bw / 2).attr("y", barY + barH / 2)
              .attr("dy", "0.35em").attr("text-anchor", "middle")
              .attr("fill", seg === "three" ? "#fff" : "#1a1a2e")
              .attr("font-size", val >= 15 ? "15px" : "13px")
              .attr("font-weight", seg === "three" ? "700" : "500")
              .attr("font-family", FONT)
              .text(val.toFixed(1) + "%");
          }
        });
      });

      // Headline callout
      if (regionData[0] && regionData[0].three > 10) {
        const topLabel = REGION_SHORT[REGION_ORDER[0]];
        chartG.append("text")
          .attr("x", MARGIN.left + chartW + 12)
          .attr("y", yScale(topLabel) + MARGIN.top + yScale.bandwidth() / 2)
          .attr("dy", "0.35em")
          .attr("fill", "#a50026").attr("font-size", "26px")
          .attr("font-weight", "900").attr("font-family", FONT)
          .text(regionData[0].three.toFixed(1) + "%");
      }

      // Fade in the clean bar chart overlay after morph completes
      chartG.transition().delay(1600).duration(500).attr("opacity", 1);
    }

    // Wire fragment event
    if (typeof Reveal !== "undefined") {
      Reveal.on("fragmentshown", function (event) {
        const slide = Reveal.getCurrentSlide();
        if (slide && slide.id === containerId.replace("tb-morph-", "triple-burden-")) {
          morphToChart();
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // INCOME GROUP BAR CHARTS (simple, no morph)
  // ═══════════════════════════════════════════════════════════
  function drawBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container || container.querySelector("svg")) return;

    const W = 960, H = Math.max(340, data.length * 70 + 100);
    const margin = { top: 30, right: 100, bottom: 60, left: 240 };
    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;

    const svg = d3.select("#" + containerId).append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`).attr("width", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(data.map(d => d.label)).range([0, height]).padding(0.3);
    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);

    g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
    g.selectAll(".axis text").style("font-size", "15px").style("font-family", FONT)
      .style("font-weight", (d, i) => i === 0 ? "700" : "400")
      .style("fill", (d, i) => i === 0 ? "#1a1a2e" : "#4a5568");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%")).select(".domain").remove();

    data.forEach((d, i) => {
      let cumX = 0;
      SEGMENT_KEYS.forEach((seg, si) => {
        const val = d[seg] || 0;
        if (val <= 0) return;
        g.append("rect").attr("x", x(cumX)).attr("y", y(d.label)).attr("height", y.bandwidth())
          .attr("fill", SEGMENT_COLORS[seg]).attr("rx", si === 0 ? 3 : 0).attr("width", 0)
          .transition().delay(i * 150 + si * 30).duration(700).ease(d3.easeCubicOut).attr("width", x(val));
        if ((seg === "three" || seg === "two") && val >= 5) {
          g.append("text").attr("x", x(cumX + val / 2)).attr("y", y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em").attr("text-anchor", "middle")
            .attr("fill", seg === "three" ? "#fff" : "#1a1a2e")
            .attr("font-size", val >= 15 ? "14px" : "12px").attr("font-weight", seg === "three" ? "700" : "500")
            .attr("font-family", FONT).attr("opacity", 0).text(val.toFixed(1) + "%")
            .transition().delay(i * 150 + 500).duration(400).attr("opacity", 1);
        }
        cumX += val;
      });
    });

    if (data[0] && data[0].three > 10) {
      svg.append("text").attr("x", margin.left + width + 8)
        .attr("y", margin.top + y(data[0].label) + y.bandwidth() / 2).attr("dy", "0.35em")
        .attr("fill", "#a50026").attr("font-size", "22px").attr("font-weight", "900")
        .attr("font-family", FONT).text(data[0].three.toFixed(1) + "%")
        .attr("opacity", 0).transition().delay(data.length * 150 + 400).duration(600).attr("opacity", 1);
    }

    const leg = svg.append("g").attr("transform", `translate(${margin.left}, ${H - 20})`);
    let legX = 0;
    SEGMENT_KEYS.forEach(seg => {
      leg.append("rect").attr("x", legX).attr("y", 0).attr("width", 12).attr("height", 12)
        .attr("rx", 2).attr("fill", SEGMENT_COLORS[seg]);
      const t = leg.append("text").attr("x", legX + 17).attr("y", 10)
        .attr("fill", "#4a5568").attr("font-size", "12px").attr("font-family", FONT).text(SEGMENT_LABELS[seg]);
      legX += (t.node().getComputedTextLength() || 80) + 30;
    });
  }

  async function initIncomeSlide() {
    const data = await loadAll();
    drawBarChart("tb-income-water", data.tbData.incomeGroups.water);
    drawBarChart("tb-income-sanitation", data.tbData.incomeGroups.sanitation);
  }

  // ═══════════════════════════════════════════════════════════
  // REVEAL WIRING
  // ═══════════════════════════════════════════════════════════
  const SLIDE_INIT = {
    "triple-burden-water": () => initMorphSlide("water", "tb-morph-water"),
    "triple-burden-sanitation": () => initMorphSlide("sanitation", "tb-morph-sanitation"),
    "triple-burden-income": () => initIncomeSlide()
  };

  function onSlideChanged(event) {
    const id = event.currentSlide.id;
    if (SLIDE_INIT[id]) SLIDE_INIT[id]();
  }

  function registerEvents() {
    if (typeof Reveal === "undefined") return;
    Reveal.on("slidechanged", onSlideChanged);
    try {
      const s = Reveal.getCurrentSlide();
      if (s && SLIDE_INIT[s.id]) SLIDE_INIT[s.id]();
    } catch (e) {}
  }

  if (typeof Reveal !== "undefined" && Reveal.isReady && Reveal.isReady()) {
    registerEvents();
  } else if (typeof Reveal !== "undefined") {
    Reveal.on("ready", registerEvents);
  }
  let n = 0;
  const poll = setInterval(() => {
    if (++n > 40) { clearInterval(poll); return; }
    if (typeof Reveal !== "undefined") {
      try { if (Reveal.isReady()) { clearInterval(poll); registerEvents(); } } catch (e) {}
    }
  }, 300);
})();
