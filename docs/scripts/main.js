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

// ── Animated counter for "X.X billion" style display ────────
function animateInfoCounter(el) {
  const display = el.dataset.display;
  const target = parseInt(el.dataset.counter);
  const duration = 1500;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;

    if (display && display.includes("billion")) {
      const billions = (current / 1000).toFixed(1);
      el.textContent = billions + " billion";
    } else {
      el.textContent = Math.round(current).toLocaleString();
    }
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
const HERO_SLIDES = ["tariffs", "tariffs-nominal", "nrw", "metering", "cost-coverage", "paradox", "affordability"];

// ── Initialize on Reveal ready ──────────────────────────────
(function initMain() {
  if (typeof Reveal === "undefined") {
    document.addEventListener("DOMContentLoaded", function() { setTimeout(initMain, 100); });
    return;
  }

  function registerListeners() {
    // Remove empty first slide (Quarto artifact)
    const slides = document.querySelectorAll(".reveal .slides > section");
    if (slides[0] && !slides[0].id && slides[0].children.length === 0) {
      slides[0].remove();
      Reveal.sync();
      Reveal.slide(0);
    }

    Reveal.on("slidechanged", (event) => {
    const slide = event.currentSlide;
    const slideId = slide.id || slide.dataset.id || "";

    // Animate counters on the coverage slide
    if (slideId === "coverage") {
      slide.querySelectorAll("[data-counter]").forEach((el) => {
        animateCounter(el, parseInt(el.dataset.counter), 1800);
      });
    }

    // Info slide: animate counters when entering (for non-fragment counters)
    if (slideId === "water-crisis-scale") {
      // First card is visible immediately on slide entry
      const firstCard = slide.querySelector(".crisis-stat");
      if (firstCard) {
        firstCard.querySelectorAll("[data-counter]").forEach((el) => {
          const display = el.dataset.display;
          if (display) {
            animateInfoCounter(el);
          } else {
            animateCounter(el, parseInt(el.dataset.counter), 1500);
          }
        });
      }
    }

    // Policy points on call-to-action slide
    if (slideId === "call-to-action") {
      revealPolicyPoints(slide);
    }

    // Reset info counters when leaving info slide
    if (slideId !== "water-crisis-scale") {
      document.querySelectorAll("#water-crisis-scale .info-number").forEach((el) => {
        el.textContent = "0";
      });
    }

    // Hero chart morphing
    if (HERO_SLIDES.includes(slideId)) {
      const evt = new CustomEvent("hero-morph", { detail: { state: slideId } });
      document.dispatchEvent(evt);
    }
  });

  // Animate counters when info card fragments become visible
  Reveal.on("fragmentshown", (event) => {
    const frag = event.fragment;

    if (!frag.classList.contains("info-card") && !frag.classList.contains("crisis-stat")) return;
    frag.querySelectorAll("[data-counter]").forEach((el) => {
      const display = el.dataset.display;
      if (display) {
        animateInfoCounter(el);
      } else {
        animateCounter(el, parseInt(el.dataset.counter), 1500);
      }
    });
  });
  } // end registerListeners

  if (Reveal.isReady && Reveal.isReady()) {
    registerListeners();
  } else {
    Reveal.on("ready", registerListeners);
  }
})();
