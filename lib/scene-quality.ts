/**
 * Quality tiers for the hero scene.
 *
 * You cannot know a visitor's GPU ahead of time, so the scene starts at a tier
 * chosen from cheap signals (pointer type, screen size) and then only ever
 * steps *down*, driven by measured frame rate. Downgrades are one-way on
 * purpose: a scene that oscillates between tiers looks worse than one that
 * settled on the lower of the two.
 */

export type Tier = "high" | "medium" | "low";

export type TierSpec = {
  /** Hard ceiling on render scale, before the pixel budget is applied. */
  maxDpr: number;
  /** Ceiling on pixels actually rasterised, so a 4K panel is not 4x the work. */
  pixelBudget: number;
  dust: number;
  motifs: number;
  envResolution: number;
  /** Whether the post-processing chain runs at all. */
  effects: boolean;
  bloomIntensity: number;
  /** Bloom renders at this fraction of the frame — its passes are the cost. */
  bloomScale: number;
  multisampling: number;
  vignette: boolean;
};

export const TIERS: Record<Tier, TierSpec> = {
  high: {
    maxDpr: 1.75,
    pixelBudget: 2_600_000,
    dust: 620,
    motifs: 6,
    envResolution: 256,
    effects: true,
    bloomIntensity: 0.95,
    bloomScale: 0.6,
    multisampling: 2,
    vignette: true,
  },
  medium: {
    maxDpr: 1.5,
    pixelBudget: 1_800_000,
    dust: 300,
    motifs: 4,
    envResolution: 128,
    effects: true,
    bloomIntensity: 0.65,
    bloomScale: 0.4,
    multisampling: 0,
    vignette: false,
  },
  low: {
    maxDpr: 1,
    pixelBudget: 1_000_000,
    dust: 120,
    motifs: 3,
    envResolution: 64,
    effects: false,
    bloomIntensity: 0,
    bloomScale: 0.4,
    multisampling: 0,
    vignette: false,
  },
};

/** Most dust any tier asks for — the buffer is allocated once at this size. */
export const MAX_DUST = Math.max(...Object.values(TIERS).map((t) => t.dust));

const ORDER: Tier[] = ["high", "medium", "low"];

/** One step down, and never back up. */
export function downgrade(tier: Tier): Tier {
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(tier) + 1)];
}

/** Cheap signals, read once: no benchmark, just a sensible starting point. */
export function startingTier(opts: { coarsePointer: boolean; smallScreen: boolean }): Tier {
  return opts.coarsePointer || opts.smallScreen ? "medium" : "high";
}

/**
 * Render scale for a viewport. Capped by the tier, then by the pixel budget,
 * then floored so the scene never turns to mush.
 *
 * Rounded to steps of 0.05 so a stream of resize events cannot cause a stream
 * of renderer reallocations.
 */
export function dprFor(tier: Tier, width: number, height: number, devicePixelRatio = 1) {
  const spec = TIERS[tier];
  const cap = Math.min(devicePixelRatio, spec.maxDpr);
  if (!(width > 0) || !(height > 0)) return cap;
  const budgeted = Math.sqrt(spec.pixelBudget / (width * height));
  const dpr = Math.max(0.6, Math.min(cap, budgeted));
  return Math.round(dpr * 20) / 20;
}
