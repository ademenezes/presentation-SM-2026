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

    const W = 1920 * 0.95;
    const H = 1080 * 0.62;
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

    // Dimming overlay — covers everything, clipped by selected region
    const dimOverlay = svg.append("rect")
      .attr("width", W).attr("height", H)
      .attr("fill", "rgba(248,245,240,0.7)")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // Clip path for the selected region (will be updated on click)
    const clipDef = svg.append("defs").append("clipPath").attr("id", "cd-region-clip");
    const clipRect = clipDef.append("rect").attr("width", W).attr("height", H); // default: full area
    const clipRegionPath = clipDef.append("path").attr("d", "");

    // Bright copy of canvas rendered inside the clip — SVG foreignObject
    // Instead, use an inverted approach: dim everything, then cut out the selected region
    // We use a mask: white = visible (dimmed), black = cut-out (shows through)
    const maskDef = svg.append("defs").append("mask").attr("id", "cd-dim-mask");
    maskDef.append("rect").attr("width", W).attr("height", H).attr("fill", "white");
    const maskCutout = maskDef.append("path").attr("fill", "black").attr("d", "");

    dimOverlay.attr("mask", "url(#cd-dim-mask)");

    // Draw mega-region boundaries — thick dark brown like original
    let activeRegion = null;
    const regionPaths = svg.selectAll("path.region")
      .data(regions.features)
      .enter().append("path")
      .attr("class", "region")
      .attr("d", path)
      .attr("fill", "rgba(0,0,0,0)")
      .attr("stroke", "#3d2b1f")
      .attr("stroke-width", 2.5)
      .attr("stroke-opacity", 0.85)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        event.stopPropagation();
        if (activeRegion === d) {
          // Deselect
          activeRegion = null;
          maskCutout.attr("d", "");
          dimOverlay.transition().duration(400).attr("opacity", 0);
          regionPaths.transition().duration(400).attr("stroke-width", 2.5).attr("stroke", "#3d2b1f");
        } else {
          // Select this region — highlight it
          activeRegion = d;
          maskCutout.attr("d", path(d));
          dimOverlay.transition().duration(400).attr("opacity", 1);
          regionPaths.transition().duration(300)
            .attr("stroke-width", function (rd) { return rd === d ? 4 : 1.5; })
            .attr("stroke", function (rd) { return rd === d ? "#1a3a5c" : "#999"; });
        }
      });

    // Click on background to deselect
    svg.on("click", function () {
      if (activeRegion) {
        activeRegion = null;
        maskCutout.attr("d", "");
        dimOverlay.transition().duration(400).attr("opacity", 0);
        regionPaths.transition().duration(400).attr("stroke-width", 2.5).attr("stroke", "#3d2b1f");
      }
    });

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
