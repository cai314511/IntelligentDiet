import test from "node:test";
import assert from "node:assert/strict";
import { bannerMotion } from "../canteen/features/banner-motion.mjs";

test("peeking, entering and changing artwork keep continuous position", () => {
  for (const width of [130, 460, 650]) {
    for (const time of [750, 1600, 3200, 4600, 9700, 16200, 22700]) {
      const before = bannerMotion(time - .01, width, width < 200 ? 130 : 186);
      const after = bannerMotion(time + .01, width, width < 200 ? 130 : 186);
      assert.ok(Math.abs(before.x - after.x) < .01, `position jumped at ${time}`);
      assert.ok(Math.abs(before.y - after.y) < .01);
      assert.ok(Math.abs(before.tilt - after.tilt) < .01);
    }
  }
});
test("Xiaozhi enters smoothly and keeps the welcome artwork until fully inside", () => {
  let previousX = Infinity;
  for (let time = 0; time < 3200; time += 16) {
    const motion = bannerMotion(time, 460, 186);
    assert.ok(motion.x <= previousX);
    assert.equal(motion.pose, -1);
    previousX = motion.x;
  }
  assert.equal(bannerMotion(3200, 460, 186).pose, 0);
  assert.equal(bannerMotion(3200, 460, 186).phase, "pose");
});
test("idle interaction stays inside the stage within a 12px local range", () => {
  for (const [width, pet] of [[130, 130], [240, 140], [460, 186], [650, 186]]) {
    const positions = [];
    for (let time = 3200; time < 160000; time += 16) {
      const motion = bannerMotion(time, width, pet);
      assert.ok(motion.x >= 0 && motion.x + pet <= width);
      assert.equal(motion.phase, "pose");
      positions.push(motion.x);
    }
    assert.ok(Math.max(...positions) - Math.min(...positions) <= 12);
  }
});
test("reduced motion keeps Xiaozhi still and fully inside the banner", () => {
  assert.deepEqual(bannerMotion(0, 460, 186, true), bannerMotion(60000, 460, 186, true));
});
