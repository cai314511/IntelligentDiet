import { bannerMotion } from "./banner-motion.mjs";

const atlas = "/assets/brand/xiaozhi-actions.png";
const frames = [
  [0, 0, 418, 465], [418, 0, 430, 465], [848, 0, 406, 465],
  [0, 470, 440, 370], [440, 470, 405, 370], [845, 470, 409, 370],
  [0, 845, 430, 409], [430, 845, 405, 409], [835, 845, 419, 409],
];
let disposeCurrent;
const artwork = (slot) => `<svg class="zx-pet-art${slot ? "" : " is-visible"}" viewBox="0 0 418 465" aria-hidden="true"><defs><clipPath id="zx-action-crop-${slot}"><rect width="418" height="465"/></clipPath></defs><image href="${atlas}" width="1254" height="1254" clip-path="url(#zx-action-crop-${slot})"/></svg>`;

export function recommendationBanner() {
  return `<section class="zx-recommendation-banner" aria-label="小智点餐推荐">
    <div class="zx-liquid" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="zx-banner-copy"><h2>不知道吃什么？</h2><p>让智能体<strong class="zx-xiaozhi-gold">小智</strong>帮您点餐</p>
      <button class="zx-button zx-banner-cta" data-action="agent">让<strong class="zx-xiaozhi-gold">小智</strong>帮我决定 <span aria-hidden="true">↗</span></button>
    </div>
    <div class="zx-banner-stage" data-phase="peek">
      <button type="button" class="zx-banner-pet" aria-label="和小智互动" data-state="0">
        <span class="zx-pet-body">${artwork(0)}${artwork(1)}</span>
      </button>
    </div>
  </section>`;
}

export function mountRecommendationBanner(root) {
  disposeCurrent?.();
  const banner = root.querySelector(".zx-recommendation-banner");
  if (!banner) return;
  const stage = banner.querySelector(".zx-banner-stage");
  const pet = banner.querySelector(".zx-banner-pet");
  const layers = [...pet.querySelectorAll("svg")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const on = (el, event, fn) => el.addEventListener(event, fn, { signal: controller.signal });
  let frame = 0, last = 0, elapsed = 0, lastPose = -1, visibleLayer = 0;
  let deck = [], previous = 0, ready = false;
  let stageWidth = stage.clientWidth, petWidth = pet.offsetWidth;
  pet.style.setProperty("--pet-x", `${stageWidth + 6}px`);
  const dimensions = new ResizeObserver(() => { stageWidth = stage.clientWidth; petWidth = pet.offsetWidth; });
  dimensions.observe(stage);
  dimensions.observe(pet);
  const nextAction = () => {
    if (!deck.length) {
      deck = Array.from({ length: 9 }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      if (deck.at(-1) === previous) [deck[0], deck[8]] = [deck[8], deck[0]];
    }
    const state = deck.pop();
    previous = state;
    visibleLayer = 1 - visibleLayer;
    const svg = layers[visibleLayer], crop = svg.querySelector("clipPath rect");
    svg.setAttribute("viewBox", frames[state].join(" "));
    ["x", "y", "width", "height"].forEach((key, i) => crop.setAttribute(key, frames[state][i]));
    layers.forEach((layer, i) => layer.classList.toggle("is-visible", i === visibleLayer));
    pet.dataset.state = String(state);
  };
  const asset = new Image();
  asset.onload = () => { ready = true; };
  asset.src = atlas;
  function ripple(event) {
    if (reduce.matches) return;
    const bounds = banner.getBoundingClientRect();
    const ring = document.createElement("span");
    ring.className = "zx-liquid-ripple";
    ring.style.left = `${event.clientX ? event.clientX - bounds.left : bounds.width / 2}px`;
    ring.style.top = `${event.clientY ? event.clientY - bounds.top : bounds.height / 2}px`;
    ring.setAttribute("aria-hidden", "true");
    banner.append(ring);
    ring.addEventListener("animationend", () => ring.remove(), { once: true });
    const rings = banner.querySelectorAll(".zx-liquid-ripple");
    if (rings.length > 5) rings[0].remove();
  }
  on(banner, "pointermove", (event) => {
    if (reduce.matches) return;
    const bounds = banner.getBoundingClientRect();
    banner.style.setProperty("--liquid-x", `${(event.clientX - bounds.left) / bounds.width * 100}%`);
    banner.style.setProperty("--liquid-y", `${(event.clientY - bounds.top) / bounds.height * 100}%`);
  });
  on(banner, "pointerleave", () => {
    banner.style.setProperty("--liquid-x", "65%");
    banner.style.setProperty("--liquid-y", "50%");
  });
  on(banner, "click", ripple);
  on(pet, "click", (event) => {
    event.stopPropagation();
    ripple(event);
    if (lastPose >= 0) nextAction();
    pet.classList.remove("zx-pet-cheer");
    void pet.offsetWidth;
    pet.classList.add("zx-pet-cheer");
  });
  on(pet.querySelector(".zx-pet-body"), "animationend", () => pet.classList.remove("zx-pet-cheer"));
  const observer = new IntersectionObserver(([entry]) => {
    banner.classList.toggle("zx-banner-paused", !entry.isIntersecting);
  });
  observer.observe(banner);
  function tick(now) {
    if (!banner.isConnected) { dispose(); return; }
    const delta = last ? Math.min(64, now - last) : 0;
    last = now;
    if (ready && !document.hidden && !banner.classList.contains("zx-banner-paused") && location.hash !== "#agent") {
      elapsed += delta;
      const motion = bannerMotion(elapsed, stageWidth, petWidth, reduce.matches);
      stage.dataset.phase = motion.phase;
      pet.style.setProperty("--pet-x", `${motion.x}px`);
      pet.style.setProperty("--pet-y", `${motion.y}px`);
      pet.style.setProperty("--pet-tilt", `${motion.tilt}deg`);
      if (motion.pose > lastPose) {
        lastPose = motion.pose;
        nextAction();
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function dispose() {
    cancelAnimationFrame(frame);
    controller.abort();
    observer.disconnect();
    dimensions.disconnect();
    asset.onload = null;
    if (disposeCurrent === dispose) disposeCurrent = undefined;
  }
  on(window, "pagehide", dispose);
  disposeCurrent = dispose;
  frame = requestAnimationFrame(tick);
}
