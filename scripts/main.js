/**
 * Main orchestration: connects Reveal.js slide events to chart modules.
 */

// ── Animated counter ────────────────────────────────────────
function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const startTime = performance.now();
  const suffix = el.dataset.suffix || "";
  const prefix = el.dataset.prefix || "";

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ── Policy points reveal ────────────────────────────────────
function revealPolicyPoints(slide) {
  const items = slide.querySelectorAll(".policy-points li");
  items.forEach((li, i) => {
    setTimeout(() => li.classList.add("visible"), 400 + i * 500);
  });
}

// ── Hero chart slide IDs ────────────────────────────────────
const HERO_SLIDES = ["tariffs", "nrw", "metering", "cost-coverage", "paradox"];

// ── Initialize on Reveal ready ──────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Reveal === "undefined") return;

  // Remove empty first slide (Quarto artifact)
  Reveal.on("ready", () => {
    const slides = document.querySelectorAll(".reveal .slides > section");
    if (slides[0] && !slides[0].id && slides[0].children.length === 0) {
      slides[0].remove();
      Reveal.sync();
      Reveal.slide(0);
    }
  });

  Reveal.on("slidechanged", (event) => {
    const slide = event.currentSlide;
    const slideId = slide.id || slide.dataset.id || "";

    // Animate counters on the coverage slide
    if (slideId === "coverage") {
      slide.querySelectorAll("[data-counter]").forEach((el) => {
        animateCounter(el, parseInt(el.dataset.counter), 1800);
      });
    }

    // Policy points on call-to-action slide
    if (slideId === "call-to-action") {
      revealPolicyPoints(slide);
    }

    // Hero chart morphing
    if (HERO_SLIDES.includes(slideId)) {
      const evt = new CustomEvent("hero-morph", { detail: { state: slideId } });
      document.dispatchEvent(evt);
    }
  });
});
