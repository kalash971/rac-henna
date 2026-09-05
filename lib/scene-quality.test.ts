import assert from "node:assert/strict";
import test from "node:test";
import { MAX_DUST, TIERS, downgrade, dprFor, startingTier } from "./scene-quality.ts";

test("downgrades step one at a time and stop at the bottom", () => {
  assert.equal(downgrade("high"), "medium");
  assert.equal(downgrade("medium"), "low");
  assert.equal(downgrade("low"), "low", "the bottom tier must be a fixed point");
});

test("each tier is cheaper than the one above it", () => {
  const order = [TIERS.high, TIERS.medium, TIERS.low];
  for (let i = 1; i < order.length; i++) {
    const above = order[i - 1];
    const here = order[i];
    assert.ok(here.maxDpr <= above.maxDpr, `tier ${i} raises maxDpr`);
    assert.ok(here.pixelBudget <= above.pixelBudget, `tier ${i} raises the pixel budget`);
    assert.ok(here.dust <= above.dust, `tier ${i} adds dust`);
    assert.ok(here.motifs <= above.motifs, `tier ${i} adds motifs`);
    assert.ok(here.envResolution <= above.envResolution, `tier ${i} raises env resolution`);
    assert.ok(here.multisampling <= above.multisampling, `tier ${i} raises multisampling`);
  }
  assert.equal(TIERS.low.effects, false, "the bottom tier must drop post-processing");
});

test("the dust buffer is sized for the greediest tier", () => {
  assert.equal(MAX_DUST, TIERS.high.dust);
  for (const tier of Object.values(TIERS)) assert.ok(tier.dust <= MAX_DUST);
});

test("touch and small screens do not start at the top tier", () => {
  assert.equal(startingTier({ coarsePointer: false, smallScreen: false }), "high");
  assert.equal(startingTier({ coarsePointer: true, smallScreen: false }), "medium");
  assert.equal(startingTier({ coarsePointer: false, smallScreen: true }), "medium");
});

test("render scale never exceeds the device's own pixel ratio", () => {
  // A 1x display must not be supersampled just because the budget allows it.
  assert.equal(dprFor("high", 1280, 800, 1), 1);
  assert.ok(dprFor("high", 1280, 800, 3) <= TIERS.high.maxDpr);
});

test("a 4K viewport is held to the pixel budget, not the tier cap", () => {
  const uhd = dprFor("high", 3840, 2160, 2);
  const fhd = dprFor("high", 1920, 1080, 2);
  assert.ok(uhd < fhd, "a bigger viewport must render at a smaller scale");
  assert.ok(uhd >= 0.6, "but never below the legibility floor");
  // Actual rasterised pixels stay within ~15% of the budget rather than 4x it.
  assert.ok(3840 * 2160 * uhd * uhd < TIERS.high.pixelBudget * 1.15);
});

test("a phone gets the tier cap, since its viewport is small", () => {
  assert.equal(dprFor("medium", 390, 844, 3), TIERS.medium.maxDpr);
  assert.equal(dprFor("low", 390, 844, 3), TIERS.low.maxDpr);
});

test("scale is quantised, so a window drag cannot thrash the renderer", () => {
  for (const w of [1280, 1281, 1283, 1290]) {
    const dpr = dprFor("high", w, 800, 2);
    assert.equal(dpr, Math.round(dpr * 20) / 20, `${w} produced an unquantised ${dpr}`);
  }
});

test("a zero-sized viewport falls back to the cap instead of dividing by zero", () => {
  assert.ok(Number.isFinite(dprFor("high", 0, 0, 2)));
  assert.equal(dprFor("high", 0, 0, 2), TIERS.high.maxDpr);
});
