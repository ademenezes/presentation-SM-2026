/**
 * Continental Drying Charts — Plotly.js (light theme)
 * Land use type vs TWS trend + Energy price vs TWS
 * Placeholder data based on Continental Drying report findings.
 */

(function () {
  "use strict";

  function initLandUseTWS() {
    const container = document.getElementById("chart-land-use-tws");
    if (!container) return;

    const landUseTypes = [
      "Cropland\nExpansion",
      "Forest\nLoss",
      "Urban\nExpansion",
      "Irrigation\nExpansion",
      "Grassland\nDegradation",
      "Wetland\nDrainage",
      "Mining\nExtraction",
      "Stable\nForest",
    ];

    const twsTrend = [-2.8, -3.5, -1.2, -4.1, -1.8, -5.2, -2.1, 0.8];

    const colors = twsTrend.map((v) =>
      v < 0 ? `rgba(232, 85, 58, ${Math.min(Math.abs(v) / 5, 1)})` : "rgba(43, 159, 147, 0.8)"
    );

    const data = [
      {
        type: "bar",
        x: landUseTypes,
        y: twsTrend,
        marker: {
          color: colors,
          line: { color: "rgba(0,0,0,0.05)", width: 1 },
        },
        text: twsTrend.map((v) => (v > 0 ? "+" : "") + v.toFixed(1) + " cm/yr"),
        textposition: "outside",
        textfont: { color: "#1a1a2e", size: 14, family: "Inter, sans-serif" },
        hovertemplate: "%{x}<br>TWS Trend: %{y:.1f} cm/year<extra></extra>",
      },
    ];

    const layout = {
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      font: { color: "#4a5568", family: "Inter, sans-serif", size: 13 },
      xaxis: {
        tickfont: { size: 12, color: "#4a5568" },
        gridcolor: "rgba(0,0,0,0.04)",
      },
      yaxis: {
        title: { text: "TWS Trend (cm/year)", font: { size: 14, color: "#4a5568" } },
        gridcolor: "rgba(0,0,0,0.06)",
        zeroline: true,
        zerolinecolor: "rgba(0,0,0,0.15)",
        zerolinewidth: 2,
      },
      margin: { t: 30, b: 100, l: 70, r: 30 },
      showlegend: false,
      shapes: [
        {
          type: "line",
          x0: -0.5,
          x1: landUseTypes.length - 0.5,
          y0: 0,
          y1: 0,
          line: { color: "rgba(0,0,0,0.15)", width: 1, dash: "dot" },
        },
      ],
      annotations: [
        {
          text: "\u2190 Water loss",
          x: 0,
          y: -5.5,
          showarrow: false,
          font: { color: "#e8553a", size: 12 },
        },
        {
          text: "Water gain \u2192",
          x: landUseTypes.length - 1,
          y: 1.2,
          showarrow: false,
          font: { color: "#2b9f93", size: 12 },
        },
      ],
    };

    Plotly.newPlot(container, data, layout, { displayModeBar: false, responsive: true });
  }

  function initEnergyTWS() {
    const container = document.getElementById("chart-energy-tws");
    if (!container) return;

    const regions = [
      { name: "Middle East", energy: 12.5, tws: -4.2, size: 40 },
      { name: "Central Asia", energy: 8.3, tws: -3.1, size: 25 },
      { name: "South Asia", energy: 6.7, tws: -2.8, size: 50 },
      { name: "North Africa", energy: 11.2, tws: -3.8, size: 30 },
      { name: "Southern Africa", energy: 9.8, tws: -2.5, size: 20 },
      { name: "Western US", energy: 14.1, tws: -3.5, size: 35 },
      { name: "Southern Europe", energy: 13.5, tws: -1.9, size: 28 },
      { name: "East Africa", energy: 5.2, tws: -1.5, size: 22 },
      { name: "Southeast Asia", energy: 7.1, tws: -0.8, size: 45 },
      { name: "Northern China", energy: 9.0, tws: -3.2, size: 55 },
    ];

    const data = [
      {
        type: "scatter3d",
        mode: "markers+text",
        x: regions.map((r) => r.energy),
        y: regions.map((r) => r.tws),
        z: regions.map((r) => r.size),
        text: regions.map((r) => r.name),
        textposition: "top center",
        textfont: { color: "#1a1a2e", size: 10 },
        marker: {
          size: regions.map((r) => r.size / 4),
          color: regions.map((r) => r.tws),
          colorscale: [
            [0, "#e8553a"],
            [0.5, "#d4a017"],
            [1, "#2b9f93"],
          ],
          opacity: 0.85,
          line: { width: 1, color: "rgba(0,0,0,0.1)" },
          colorbar: {
            title: { text: "TWS<br>Trend", font: { size: 11, color: "#4a5568" } },
            tickfont: { size: 10, color: "#4a5568" },
            len: 0.5,
          },
        },
        hovertemplate:
          "<b>%{text}</b><br>" +
          "Energy cost: %{x:.1f} \u00a2/kWh<br>" +
          "TWS trend: %{y:.1f} cm/yr<br>" +
          "Pop. affected: %{z}M<extra></extra>",
      },
    ];

    const layout = {
      paper_bgcolor: "#ffffff",
      font: { color: "#4a5568", family: "Inter, sans-serif", size: 11 },
      scene: {
        bgcolor: "#f7f8fa",
        xaxis: {
          title: "Energy Cost (\u00a2/kWh)",
          gridcolor: "rgba(0,0,0,0.06)",
          color: "#4a5568",
        },
        yaxis: {
          title: "TWS Trend (cm/yr)",
          gridcolor: "rgba(0,0,0,0.06)",
          color: "#4a5568",
        },
        zaxis: {
          title: "Pop. Affected (M)",
          gridcolor: "rgba(0,0,0,0.06)",
          color: "#4a5568",
        },
        camera: {
          eye: { x: 1.6, y: -1.6, z: 0.8 },
          center: { x: 0, y: 0, z: -0.1 },
        },
      },
      margin: { t: 10, b: 10, l: 10, r: 10 },
      showlegend: false,
    };

    Plotly.newPlot(container, data, layout, {
      displayModeBar: true,
      modeBarButtonsToRemove: ["toImage", "sendDataToCloud"],
      responsive: true,
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof Reveal === "undefined") return;

    Reveal.on("slidechanged", (event) => {
      const id = event.currentSlide.id || "";
      if (id === "land-use-tws") initLandUseTWS();
      if (id === "energy-tws") initEnergyTWS();
    });
  });
})();
