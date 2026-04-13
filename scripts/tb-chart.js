/**
 * Triple Burden — D3 ADM2 choropleth maps + regional bar charts (separate slides)
 * Maps render dissolved ADM2 polygons with interactive region cards.
 * Bar charts show regional burden breakdowns.
 */

(function () {
  "use strict";

  const FONT = "Nunito, -apple-system, BlinkMacSystemFont, sans-serif";
  const FONT_HEADING = "'Playfair Display', Georgia, serif";

  // Burden colors — aligned with Color.docx palette
  const BURDEN_COLORS = {
    "-9": "#d0d0d0", "0": "#c8d8e4", "1": "#d4909e",
    "2": "#b85c70", "3": "#8b1a2d"
  };
  const BURDEN_LABELS = {
    "-9": "No Data", "0": "No burdens", "1": "One burden",
    "2": "Two burdens", "3": "Three burdens"
  };
  const BURDEN_KEYS_ORDERED = ["3", "2", "1", "0", "-9"];

  // For bar chart
  const SEG_KEYS = ["three", "two", "one", "none", "noData"];
  const SEG_LABELS = {
    three: "Three burdens", two: "Two burdens", one: "One burden",
    none: "No burdens", noData: "No data"
  };
  const SEG_COLORS = {
    three: "#8b1a2d", two: "#b85c70", one: "#d4909e",
    none: "#c8d8e4", noData: "#d0d0d0"
  };

  const REGION_ORDER = [
    "Sub-Saharan Africa", "South Asia", "East Asia and Pacific",
    "Latin America and the Caribbean",
    "Middle East, North Africa, Afghanistan and Pakistan",
    "Europe and Central Asia", "North America"
  ];
  const REGION_SHORT = {
    "Sub-Saharan Africa": "Sub-Saharan Africa",
    "South Asia": "South Asia",
    "East Asia and Pacific": "East Asia and Pacific",
    "Latin America and the Caribbean": "Latin America and the Caribbean",
    "Middle East, North Africa, Afghanistan and Pakistan": "Middle East and North Africa",
    "Europe and Central Asia": "Europe and Central Asia",
    "North America": "North America"
  };
  const REG_CODE_TO_NAME = {
    "SSA": "Sub-Saharan Africa", "SA": "South Asia",
    "EAP": "East Asia and Pacific", "LAC": "Latin America and the Caribbean",
    "MENAAP": "Middle East, North Africa, Afghanistan and Pakistan",
    "ECA": "Europe and Central Asia", "NorthAm": "North America"
  };
  const REGION_FILL = {
    "Sub-Saharan Africa": "#8b1a2d",
    "South Asia": "#b85c70",
    "East Asia and Pacific": "#1a3a5c",
    "Latin America and the Caribbean": "#d4909e",
    "Middle East, North Africa, Afghanistan and Pakistan": "#6699cc",
    "Europe and Central Asia": "#2e6da4",
    "North America": "#c8d8e4"
  };

  let tbCountries = null;
  async function loadRegionData() {
    if (tbCountries) return tbCountries;
    tbCountries = await fetch("data/tb_countries.json").then(r => r.json());
    return tbCountries;
  }

  // ═══════════════════════════════════════════════════════════
  // MAP SLIDE
  // ═══════════════════════════════════════════════════════════
  async function initMapSlide(sector, containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";

    container.style.position = "relative";

    // Load ADM2 dissolved GeoJSON + region stats
    let adm2, regionStats;
    try {
      const [adm2Data, tbData] = await Promise.all([
        fetch("data/tb_adm2_" + sector + ".json").then(r => r.json()),
        loadRegionData()
      ]);
      adm2 = adm2Data;
      regionStats = tbData.regions[sector];
    } catch (e) {
      container.innerHTML = '<p style="color:#8b1a2d; padding:40px; font-family:' + FONT + '">Error loading map data: ' + e.message + '</p>';
      return;
    }

    // Use same projection as Replit app
    const W = 960, H = 540;
    const MAP_H = 460;
    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("display", "block")
      .style("background", "#f8f5f0");

    const projection = d3.geoNaturalEarth1()
      .scale(195)
      .center([10, 15])
      .translate([W / 2, MAP_H / 2]);
    const pathGen = d3.geoPath().projection(projection);

    // Flat path generator for pre-projected burden polygons (bypasses D3 winding)
    function projectFeature(feat) {
      const g = feat.geometry;
      const projected = JSON.parse(JSON.stringify(g));
      if (g.type === "Polygon") {
        projected.coordinates = g.coordinates.map(ring =>
          ring.map(c => { const p = projection(c); return p ? [p[0], p[1]] : [0, 0]; })
        );
      } else if (g.type === "MultiPolygon") {
        projected.coordinates = g.coordinates.map(poly =>
          poly.map(ring =>
            ring.map(c => { const p = projection(c); return p ? [p[0], p[1]] : [0, 0]; })
          )
        );
      }
      return { ...feat, geometry: projected };
    }
    const flatPath = d3.geoPath(null);

    // Clip
    const clipId = "clip-" + containerId;
    svg.append("defs").append("clipPath").attr("id", clipId)
      .append("rect").attr("width", W).attr("height", H);
    const mapG = svg.append("g").attr("clip-path", `url(#${clipId})`);

    // Ocean background (no outline)
    mapG.append("path")
      .datum({ type: "Sphere" })
      .attr("d", pathGen)
      .attr("fill", "#f8f5f0")
      .attr("stroke", "#f8f5f0")
      .attr("stroke-width", 3);

    // Load world boundaries for base country fill
    let worldGeo;
    try {
      const worldData = await fetch("data/world.json").then(r => r.json());
      if (worldData.type === "Topology" && worldData.objects) {
        worldGeo = topojson.feature(worldData, worldData.objects.countries || Object.values(worldData.objects)[0]);
      } else {
        worldGeo = worldData;
      }
    } catch (e) { /* proceed without base layer */ }

    // Base country fills
    if (worldGeo) {
      mapG.selectAll("path.country-base")
        .data(worldGeo.features)
        .enter().append("path")
        .attr("class", "country-base")
        .attr("d", pathGen)
        .attr("fill", "#f5f2ec")
        .attr("stroke", "#f5f2ec")
        .attr("stroke-width", 0.3);
    }

    // ADM2 dissolved burden polygons — pre-projected to bypass D3 winding issues
    const projectedFeatures = adm2.features.map(f => projectFeature(f));
    const burdenPaths = mapG.selectAll("path.burden")
      .data(projectedFeatures)
      .enter().append("path")
      .attr("class", "burden")
      .attr("d", flatPath)
      .attr("fill", d => BURDEN_COLORS[String(d.properties.b)] || "#d0d0d0")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.1)
      .style("cursor", "pointer")
      .on("mouseenter", function() {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 0.8);
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.15);
      })
      .on("click", function(event, d) {
        const regionCode = d.properties.r;
        const regionName = REG_CODE_TO_NAME[regionCode];
        if (regionName && REGION_ORDER.includes(regionName)) {
          showCard(regionName);
        }
      });

    // Country borders overlay
    if (worldGeo) {
      mapG.selectAll("path.country-border")
        .data(worldGeo.features)
        .enter().append("path")
        .attr("class", "country-border")
        .attr("d", pathGen)
        .attr("fill", "none")
        .attr("stroke", "rgba(100,90,80,0.2)")
        .attr("stroke-width", 0.25)
        .style("pointer-events", "none");
    }

    // Cover the projection boundary edge with a background-colored stroke on top
    mapG.append("path")
      .datum({ type: "Sphere" })
      .attr("d", pathGen)
      .attr("fill", "none")
      .attr("stroke", "#f8f5f0")
      .attr("stroke-width", 6)
      .style("pointer-events", "none");

    // Legend
    const legendG = svg.append("g")
      .attr("transform", `translate(${W / 2 - 280}, ${H - 45})`);
    let lx = 0;
    BURDEN_KEYS_ORDERED.forEach(key => {
      legendG.append("rect").attr("x", lx).attr("y", 0)
        .attr("width", 14).attr("height", 14).attr("rx", 2)
        .attr("fill", BURDEN_COLORS[key]);
      const t = legendG.append("text").attr("x", lx + 19).attr("y", 11)
        .attr("fill", "#4a5568").attr("font-size", "13px")
        .attr("font-family", FONT).text(BURDEN_LABELS[key]);
      lx += (t.node().getComputedTextLength() || 70) + 26;
    });

    // Source (bottom left)
    svg.append("text")
      .attr("x", 10).attr("y", H - 6)
      .attr("fill", "#6b7280").attr("font-size", "11px").attr("font-style", "italic")
      .attr("font-family", FONT)
      .text("Source: World Bank Triple Burden Analysis (2025) | ADM2-level, 130+ countries");

    // ── INTERACTIVE REGION CARDS ───────────────────────────
    let activeCard = null;

    function showCard(regionName) {
      if (activeCard) activeCard.remove();

      const rd = regionStats[regionName];
      if (!rd) return;

      burdenPaths.style("opacity", function(d) {
        const rn = REG_CODE_TO_NAME[d.properties.r];
        return rn === regionName ? 1 : 0.3;
      });

      const card = document.createElement("div");
      card.style.cssText = `
        position: absolute; top: 50%; right: 20px; transform: translateY(-50%);
        width: 320px; background: rgba(255,255,255,0.97);
        border: 1px solid #c8b8a2; border-left: 4px solid ${REGION_FILL[regionName] || "#8b1a2d"};
        box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 2px;
        padding: 22px 22px 18px; z-index: 100; font-family: ${FONT};
      `;

      const threePct = (rd.three || 0).toFixed(1);
      const twoPct = (rd.two || 0).toFixed(1);
      const shortName = REGION_SHORT[regionName];

      card.innerHTML = `
        <p style="font-family:${FONT_HEADING}; font-weight:900; font-size:2.1em; color:#8b1a2d; margin:0; line-height:1.1;">
          ${threePct}%
        </p>
        <p style="font-family:${FONT_HEADING}; font-weight:700; font-size:1.05em; color:#1a3a5c; margin:4px 0 0;">
          ${shortName}
        </p>
        <p style="font-size:0.68em; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; color:#6b7280; margin:6px 0 12px;">
          Population facing three burdens
        </p>
        <div style="display:flex; gap:2px; height:18px; border-radius:3px; overflow:hidden; margin-bottom:12px;">
          <div style="flex:${rd.three || 0.01}; background:#8b1a2d;"></div>
          <div style="flex:${rd.two || 0.01}; background:#b85c70;"></div>
          <div style="flex:${rd.one || 0.01}; background:#d4909e;"></div>
          <div style="flex:${rd.none || 0.01}; background:#c8d8e4;"></div>
          <div style="flex:${rd.noData || 0.01}; background:#d0d0d0;"></div>
        </div>
        <p style="font-size:0.76em; line-height:1.65; color:#444; margin:0;">
          <strong>${threePct}%</strong> of ${shortName}'s population faces all three burdens —
          poverty, ${sector === "water" ? "drought risk" : "flood risk"}, and inadequate ${sector === "water" ? "water access" : "sanitation"}.
          Another <strong>${twoPct}%</strong> faces two.
        </p>
        <button style="
          position:absolute; top:8px; right:12px; background:none; border:none;
          font-size:0.72em; color:#6b7280; cursor:pointer; font-weight:700;
          font-family:${FONT}; letter-spacing:0.04em;
        ">CLOSE ×</button>
      `;

      card.querySelector("button").onclick = () => {
        card.remove();
        activeCard = null;
        burdenPaths.style("opacity", 1);
      };

      container.appendChild(card);
      activeCard = card;
    }

    // Click on empty area to close card
    svg.on("click", function(event) {
      if (event.target.tagName === "svg") {
        if (activeCard) {
          activeCard.remove();
          activeCard = null;
          burdenPaths.style("opacity", 1);
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REGIONAL BAR CHART SLIDE
  // ═══════════════════════════════════════════════════════════
  async function initRegionChart(sector, containerId) {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.initialized) return;
    container.dataset.initialized = "true";

    const tbData = await loadRegionData();
    const regionStats = tbData.regions[sector];
    if (!regionStats) return;

    const CW = 1760, CH = 820;
    const chartSvg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${CW} ${CH}`)
      .attr("width", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    const MARGIN = { top: 30, right: 120, bottom: 50, left: 300 };
    const chartW = CW - MARGIN.left - MARGIN.right;
    const chartH = CH - MARGIN.top - MARGIN.bottom - 40;

    const yScale = d3.scaleBand()
      .domain(REGION_ORDER.map(r => REGION_SHORT[r]))
      .range([0, chartH]).padding(0.25);
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, chartW]);

    // Gridlines
    chartSvg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`)
      .call(d3.axisLeft(yScale).tickSize(-chartW).tickFormat(""))
      .select(".domain").remove();
    chartSvg.selectAll(".tick line").attr("stroke", "rgba(0,0,0,0.05)");

    // Y axis
    REGION_ORDER.forEach((region, i) => {
      const label = REGION_SHORT[region];
      chartSvg.append("text")
        .attr("x", MARGIN.left - 14)
        .attr("y", yScale(label) + MARGIN.top + yScale.bandwidth() / 2)
        .attr("dy", "0.35em").attr("text-anchor", "end")
        .attr("fill", i === 0 ? "#282c34" : "#4a5568")
        .attr("font-size", "17px")
        .attr("font-weight", i === 0 ? "700" : "400")
        .attr("font-family", FONT).text(label);
    });

    // X axis
    const xAxisG = chartSvg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top + chartH})`);
    xAxisG.call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"));
    xAxisG.select(".domain").remove();
    xAxisG.selectAll("text").attr("fill", "#6b7280").attr("font-size", "13px");
    xAxisG.selectAll("line").attr("stroke", "rgba(0,0,0,0.07)");

    // Bar segments with entrance animation
    REGION_ORDER.forEach((region, ri) => {
      const rd = regionStats[region];
      if (!rd) return;
      const label = REGION_SHORT[region];
      const barY = yScale(label) + MARGIN.top;
      const barH = yScale.bandwidth();
      let cumX = 0;

      SEG_KEYS.forEach((seg, si) => {
        const val = rd[seg] || 0;
        if (val <= 0) return;
        const bx = MARGIN.left + xScale(cumX);
        const bw = xScale(val);
        cumX += val;

        chartSvg.append("rect")
          .attr("x", bx).attr("y", barY)
          .attr("width", 0).attr("height", barH)
          .attr("fill", SEG_COLORS[seg])
          .attr("rx", si === 0 ? 4 : 0)
          .transition().delay(ri * 100 + si * 30).duration(600)
          .ease(d3.easeCubicOut).attr("width", bw);

        if (si > 0) {
          chartSvg.append("line")
            .attr("x1", bx).attr("x2", bx)
            .attr("y1", barY).attr("y2", barY + barH)
            .attr("stroke", "#fff").attr("stroke-width", 1.5)
            .attr("opacity", 0)
            .transition().delay(ri * 100 + si * 30 + 300).duration(300).attr("opacity", 1);
        }

        if ((seg === "three" || seg === "two") && val >= 5) {
          chartSvg.append("text")
            .attr("x", bx + bw / 2).attr("y", barY + barH / 2)
            .attr("dy", "0.35em").attr("text-anchor", "middle")
            .attr("fill", seg === "three" ? "#fff" : "#282c34")
            .attr("font-size", val >= 15 ? "15px" : "13px")
            .attr("font-weight", seg === "three" ? "700" : "500")
            .attr("font-family", FONT)
            .text(val.toFixed(1) + "%")
            .attr("opacity", 0)
            .transition().delay(ri * 100 + 400).duration(400).attr("opacity", 1);
        }
      });
    });

    // Headline callout
    const topRd = regionStats[REGION_ORDER[0]];
    if (topRd && topRd.three > 10) {
      const topLabel = REGION_SHORT[REGION_ORDER[0]];
      chartSvg.append("text")
        .attr("x", MARGIN.left + chartW + 14)
        .attr("y", yScale(topLabel) + MARGIN.top + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#8b1a2d").attr("font-size", "26px")
        .attr("font-weight", "900").attr("font-family", FONT)
        .text(topRd.three.toFixed(1) + "%")
        .attr("opacity", 0)
        .transition().delay(800).duration(600).attr("opacity", 1);
    }

    // Chart legend
    const cLegG = chartSvg.append("g")
      .attr("transform", `translate(${CW / 2 - 280}, ${CH - 22})`);
    let clx = 0;
    SEG_KEYS.forEach(seg => {
      cLegG.append("rect").attr("x", clx).attr("y", 0)
        .attr("width", 14).attr("height", 14).attr("rx", 2)
        .attr("fill", SEG_COLORS[seg]);
      const t = cLegG.append("text").attr("x", clx + 19).attr("y", 11)
        .attr("fill", "#4a5568").attr("font-size", "13px")
        .attr("font-family", FONT).text(SEG_LABELS[seg]);
      clx += (t.node().getComputedTextLength() || 80) + 28;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INCOME GROUP BAR CHARTS
  // ═══════════════════════════════════════════════════════════
  async function initIncomeSlide() {
    const tbData = await fetch("data/tb_data.json").then(r => r.json());
    drawIncomeChart("tb-income-water", tbData.incomeGroups.water);
    drawIncomeChart("tb-income-sanitation", tbData.incomeGroups.sanitation);
  }

  function drawIncomeChart(containerId, data) {
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
      .style("fill", (d, i) => i === 0 ? "#282c34" : "#4a5568");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%")).select(".domain").remove();

    data.forEach((d, i) => {
      let cumX = 0;
      SEG_KEYS.forEach((seg, si) => {
        const val = d[seg] || 0;
        if (val <= 0) return;
        g.append("rect").attr("x", x(cumX)).attr("y", y(d.label)).attr("height", y.bandwidth())
          .attr("fill", SEG_COLORS[seg]).attr("rx", si === 0 ? 3 : 0).attr("width", 0)
          .transition().delay(i * 150 + si * 30).duration(700).ease(d3.easeCubicOut).attr("width", x(val));
        if ((seg === "three" || seg === "two") && val >= 5) {
          g.append("text").attr("x", x(cumX + val / 2)).attr("y", y(d.label) + y.bandwidth() / 2)
            .attr("dy", "0.35em").attr("text-anchor", "middle")
            .attr("fill", seg === "three" ? "#fff" : "#282c34")
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
        .attr("fill", "#8b1a2d").attr("font-size", "22px").attr("font-weight", "900")
        .attr("font-family", FONT).text(data[0].three.toFixed(1) + "%")
        .attr("opacity", 0).transition().delay(data.length * 150 + 400).duration(600).attr("opacity", 1);
    }

    const leg = svg.append("g").attr("transform", `translate(${margin.left}, ${H - 20})`);
    let legX = 0;
    SEG_KEYS.forEach(seg => {
      leg.append("rect").attr("x", legX).attr("y", 0).attr("width", 12).attr("height", 12)
        .attr("rx", 2).attr("fill", SEG_COLORS[seg]);
      const t = leg.append("text").attr("x", legX + 17).attr("y", 10)
        .attr("fill", "#4a5568").attr("font-size", "12px").attr("font-family", FONT).text(SEG_LABELS[seg]);
      legX += (t.node().getComputedTextLength() || 80) + 30;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REVEAL WIRING
  // ═══════════════════════════════════════════════════════════
  const SLIDE_INIT = {
    "triple-burden-water":           () => initMapSlide("water", "tb-map-water"),
    "triple-burden-water-chart":     () => initRegionChart("water", "tb-chart-water"),
    "triple-burden-sanitation":      () => initMapSlide("sanitation", "tb-map-sanitation"),
    "triple-burden-sanitation-chart": () => initRegionChart("sanitation", "tb-chart-sanitation"),
    "triple-burden-income":          () => initIncomeSlide()
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
