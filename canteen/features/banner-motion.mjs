const blend = (from, to, progress) => {
  const t = Math.min(1, Math.max(0, progress));
  return from + (to - from) * t * t * (3 - 2 * t);
};

// All phases use the same stage origin, including the part beyond its right edge.
export function bannerMotion(time, stageWidth, petWidth, reduced = false) {
  const travel = Math.max(0, stageWidth - petWidth - 12);
  const peek = travel + petWidth * .53;
  const anchor = travel * .8;
  if (reduced) return { phase: "pose", x: anchor, tilt: 0, y: 0, pose: 0 };
  if (time < 1600) return {
    phase: "peek", x: blend(stageWidth + 6, peek, time / 750),
    tilt: -13, y: 8, pose: -1,
  };
  if (time < 3200) return {
    phase: "emerge", x: blend(peek, anchor, (time - 1600) / 1600),
    tilt: blend(-13, 0, (time - 1600) / 1600),
    y: blend(8, 0, (time - 1600) / 1600), pose: -1,
  };
  const elapsed = time - 3200;
  const amplitude = Math.min(6, travel * .08);
  // Ease into a small local sway; changing artwork never changes the anchor.
  const sway = Math.sin(elapsed / 14000 * Math.PI * 2) * blend(0, amplitude, elapsed / 1400);
  return {
    phase: "pose", x: anchor + sway,
    tilt: 0, y: 0, pose: Math.floor(elapsed / 3500),
  };
}
