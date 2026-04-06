/**
 * Coverage Map — D3.js choropleth (light theme)
 * Shows countries with utility performance data, colored by region.
 */

(function () {
  "use strict";

  const REGION_COLORS = {
    "Sub-Saharan Africa": "#e8553a",
    "East Asia & Pacific": "#0071bc",
    "Europe & Central Asia": "#6c4fa0",
    "Latin America & Caribbean": "#2b9f93",
    "Middle East, North Africa, Afghanistan & Pakistan": "#d4a017",
    "South Asia": "#c7365f",
  };

  const REGION_SHORT = {
    "Sub-Saharan Africa": "Sub-Saharan Africa",
    "East Asia & Pacific": "East Asia & Pacific",
    "Europe & Central Asia": "Europe & Central Asia",
    "Latin America & Caribbean": "Latin America",
    "Middle East, North Africa, Afghanistan & Pakistan": "MENA",
    "South Asia": "South Asia",
  };

  async function init() {
    const container = document.getElementById("coverage-map");
    if (!container) return;
    if (container.querySelector("svg")) return; // Already initialized

    const [world, coverage] = await Promise.all([
      fetch("data/world.json").then((r) => r.json()),
      fetch("data/coverage_map.json").then((r) => r.json()),
    ]);

    const w = 1766;
    const h = 520;

    // Build lookup
    const countryData = {};
    coverage.countries.forEach((c) => {
      countryData[c.iso3] = c;
    });

    // Handle both GeoJSON and TopoJSON formats
    let countries;
    if (world.type === "Topology" && world.objects) {
      countries = topojson.feature(world, world.objects.countries || Object.values(world.objects)[0]);
    } else {
      countries = world;
    }

    const projection = d3.geoNaturalEarth1()
      .fitSize([w, h - 40], countries);

    const path = d3.geoPath().projection(projection);

    const svg = d3.select("#coverage-map")
      .append("svg")
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("width", "100%")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Ocean background
    svg.append("path")
      .datum({ type: "Sphere" })
      .attr("d", path)
      .attr("fill", "#d0e2f2")
      .attr("stroke", "#a8c4de")
      .attr("stroke-width", 1.5);

    // Layer 1: country fills (no strokes — strokes drawn separately on top)
    svg.selectAll("path.country-fill")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("class", "country-fill")
      .attr("d", path)
      .attr("fill", (d) => {
        const iso3 = d.properties.iso3 || d.properties.iso_a3 || d.properties.ISO_A3 || d.id;
        const cd = countryData[iso3];
        if (cd) return REGION_COLORS[cd.region] || "#0071bc";
        return "#eaeaea";
      })
      .attr("stroke", "none");

    // Layer 2: country borders on top (so they aren't covered by adjacent fills)
    svg.selectAll("path.country-border")
      .data(countries.features)
      .enter()
      .append("path")
      .attr("class", "country-border")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.2)

    // Layer 3: bold outlines for covered countries so they pop
    const coveredFeatures = countries.features.filter(d => {
      const iso3 = d.properties.iso3 || d.properties.iso_a3 || d.properties.ISO_A3 || d.id;
      return !!countryData[iso3];
    });
    svg.selectAll("path.country-highlight")
      .data(coveredFeatures)
      .enter()
      .append("path")
      .attr("class", "country-highlight")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const iso3 = d.properties.iso3 || d.properties.iso_a3 || d.properties.ISO_A3 || d.id;
        const cd = countryData[iso3];
        // Use a darker version of the region color for the outline
        const c = d3.color(REGION_COLORS[cd.region] || "#0071bc");
        return c.darker(0.5).toString();
      })
      .attr("stroke-width", 2.5);

    // Legend
    const legendG = svg.append("g")
      .attr("transform", `translate(${w * 0.05}, ${h - 20})`);

    const regions = Object.keys(REGION_COLORS);
    const spacing = Math.min(280, (w * 0.9) / regions.length);
    regions.forEach((region, i) => {
      const x = i * spacing;
      legendG.append("rect")
        .attr("x", x).attr("y", 0)
        .attr("width", 14).attr("height", 14)
        .attr("rx", 2)
        .attr("fill", REGION_COLORS[region]);

      legendG.append("text")
        .attr("x", x + 20).attr("y", 11)
        .attr("fill", "#4a5568")
        .attr("font-size", "13px")
        .attr("font-family", "-apple-system, BlinkMacSystemFont, sans-serif")
        .text(REGION_SHORT[region]);
    });
  }

  // Initialize when the coverage slide becomes visible
  function tryInit() {
    if (typeof Reveal === "undefined") return;
    try {
      const currentSlide = Reveal.getCurrentSlide();
      if (currentSlide && currentSlide.id === "coverage") {
        init();
      }
    } catch (e) { /* Reveal not ready yet */ }
  }

  function registerEvents() {
    if (typeof Reveal === "undefined") return;
    Reveal.on("slidechanged", (event) => {
      if (event.currentSlide.id === "coverage") {
        init();
      }
    });
    tryInit();
  }

  if (typeof Reveal !== "undefined" && Reveal.isReady && Reveal.isReady()) {
    registerEvents();
  } else if (typeof Reveal !== "undefined") {
    Reveal.on("ready", registerEvents);
  }
  let attempts = 0;
  const poller = setInterval(() => {
    attempts++;
    if (attempts > 20) { clearInterval(poller); return; }
    if (typeof Reveal !== "undefined") {
      try {
        if (Reveal.isReady()) {
          clearInterval(poller);
          registerEvents();
        }
      } catch (e) {}
    }
  }, 300);
})();
