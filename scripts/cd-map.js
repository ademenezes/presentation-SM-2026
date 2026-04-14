/**
 * Continental Drying Map — D3.js canvas renderer
 * Renders GRACE/GRACE-FO TWS trend data as a choropleth heatmap
 * with mega-region boundary overlays.
 * Color scheme: dark red (#A81F2F) → cream (#FDF7BD) → dark blue (#0073B5)
 */

(function () {
  "use strict";

  // Original map color scheme (NOT the presentation palette — intentionally different)
  const COLOR_NEG2 = [168, 31, 47];   // #A81F2F — strong drying
  const COLOR_ZERO = [253, 247, 189];  // #FDF7BD — neutral
  const COLOR_POS2 = [0, 115, 181];    // #0073B5 — water gain

  function interpolateColor(val) {
    // val: -2 to +2, clamped
    const t = Math.max(-2, Math.min(2, val));
    let r, g, b;
    if (t <= 0) {
      // -2 to 0: red to cream
      const f = (t + 2) / 2;
      r = COLOR_NEG2[0] + f * (COLOR_ZERO[0] - COLOR_NEG2[0]);
      g = COLOR_NEG2[1] + f * (COLOR_ZERO[1] - COLOR_NEG2[1]);
      b = COLOR_NEG2[2] + f * (COLOR_ZERO[2] - COLOR_NEG2[2]);
    } else {
      // 0 to +2: cream to blue
      const f = t / 2;
      r = COLOR_ZERO[0] + f * (COLOR_POS2[0] - COLOR_ZERO[0]);
      g = COLOR_ZERO[1] + f * (COLOR_POS2[1] - COLOR_ZERO[1]);
      b = COLOR_ZERO[2] + f * (COLOR_POS2[2] - COLOR_ZERO[2]);
    }
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  async function renderCDMap() {
    const container = document.getElementById("cd-map-container");
    if (!container) return;
    container.innerHTML = "";

    const W = container.clientWidth || 1920 * 0.95;
    const H = container.clientHeight || 1080 * 0.62;
    const FONT = "'Nunito', -apple-system, sans-serif";
    const FONT_HEADING = "'Playfair Display', Georgia, serif";

    // Load data
    const [grid, regions, world] = await Promise.all([
      fetch("data/cd_raster_grid.json?v=2").then(r => r.json()),
      fetch("data/cd_mega_regions.json?v=1").then(r => r.json()),
      fetch("data/cd_world_outline.json?v=1").then(r => r.json()),
    ]);

    // Create SVG + Canvas combo
    const wrapper = d3.select(container).append("div")
      .style("position", "relative").style("width", W + "px").style("height", H + "px")
      .style("margin", "0 auto");

    // Canvas for raster (fast pixel rendering)
    const canvas = wrapper.append("canvas")
      .attr("width", W).attr("height", H)
      .style("position", "absolute").style("top", "0").style("left", "0");

    // SVG overlay for vector boundaries + legend
    const svg = wrapper.append("svg")
      .attr("width", W).attr("height", H)
      .style("position", "absolute").style("top", "0").style("left", "0");

    // Equal Earth projection — push map down to leave space for title
    const projection = d3.geoEqualEarth()
      .fitSize([W * 0.96, H * 0.82], { type: "Sphere" })
      .translate([W / 2, H * 0.42]);
    const path = d3.geoPath().projection(projection);
    const pathCtx = d3.geoPath().projection(projection);

    const ctx = canvas.node().getContext("2d");

    // White background (like original)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Draw light land base fill
    ctx.fillStyle = "#faf6ee";
    ctx.beginPath();
    pathCtx.context(ctx)(world.features[0]);
    ctx.fill();

    // Draw raster grid — larger pixels for continuous coverage
    const pixelSize = Math.ceil(W / 350);
    grid.forEach(pt => {
      const [lon, lat, val] = pt;
      const projected = projection([lon, lat]);
      if (!projected) return;
      const [x, y] = projected;
      ctx.fillStyle = interpolateColor(val);
      ctx.fillRect(x - pixelSize / 2, y - pixelSize / 2, pixelSize, pixelSize);
    });

    // Clip raster to land only — redraw ocean as white
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    pathCtx.context(ctx)(world.features[0]);
    ctx.fill();
    ctx.restore();

    // Legend bar
    const legendW = 360, legendH = 16;
    const legendX = W / 2 - legendW / 2;
    const legendY = H - 58;
    const legendG = svg.append("g").attr("transform", `translate(${legendX}, ${legendY})`);

    // Gradient
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "cd-legend-grad");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#A81F2F");
    grad.append("stop").attr("offset", "50%").attr("stop-color", "#FDF7BD");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#0073B5");

    legendG.append("rect").attr("width", legendW).attr("height", legendH)
      .attr("fill", "url(#cd-legend-grad)").attr("rx", 2);

    // Legend labels
    const labels = ["-2", "-1.5", "-1", "-0.5", "0", "0.5", "1", "1.5", "2"];
    labels.forEach((lbl, i) => {
      const x = (i / (labels.length - 1)) * legendW;
      legendG.append("line").attr("x1", x).attr("x2", x)
        .attr("y1", legendH).attr("y2", legendH + 5).attr("stroke", "#666").attr("stroke-width", 0.5);
      legendG.append("text").attr("x", x).attr("y", legendH + 18)
        .attr("text-anchor", "middle").attr("fill", "#4a5568")
        .attr("font-size", "13px").attr("font-family", FONT).text(lbl);
    });
    legendG.append("text").attr("x", legendW / 2).attr("y", legendH + 34)
      .attr("text-anchor", "middle").attr("fill", "#4a5568")
      .attr("font-size", "14px").attr("font-family", FONT).text("centimeters per year");

    // Source is managed outside SVG in the slide HTML
  }

  // Trigger on slide — robust pattern
  (function () {
    function setup() {
      Reveal.on("slidechanged", function (ev) {
        if (ev.currentSlide.id === "continental-drying") renderCDMap();
      });
      // Also render if already on this slide
      var curr = Reveal.getCurrentSlide();
      if (curr && curr.id === "continental-drying") renderCDMap();
    }
    if (typeof Reveal !== "undefined" && Reveal.isReady && Reveal.isReady()) {
      setup();
    } else if (typeof Reveal !== "undefined") {
      Reveal.on("ready", setup);
    } else {
      document.addEventListener("DOMContentLoaded", function () { setTimeout(setup, 500); });
    }
  })();
})();
