/**
 * The 3D henna assets, as plain geometry.
 *
 * Separated from the React scene so the shape and layout maths can be checked
 * with `npm test` — a NaN or an inverted petal is otherwise invisible until
 * someone opens the page on a device you do not have.
 */

import * as THREE from "three";

export const EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.07,
  bevelEnabled: true,
  bevelThickness: 0.028,
  bevelSize: 0.032,
  // 84 copies of this shape ship to the GPU. At a petal's on-screen size these
  // are indistinguishable from 3/22 and cut about a third of the triangles.
  bevelSegments: 2,
  curveSegments: 14,
};

/** Symmetric leaf/petal. Base sits at the origin, tip points along +Y. */
export function petalShape(w = 0.42, h = 1) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w, h * 0.18, w * 0.86, h * 0.72, 0, h);
  s.bezierCurveTo(-w * 0.86, h * 0.72, -w, h * 0.18, 0, 0);
  return s;
}

/** The mango/paisley: signature mehndi motif, with its curled tip. */
export function paisleyShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.86, 0.12, 1.02, 0.92, 0.26, 1.36);
  s.bezierCurveTo(-0.12, 1.56, -0.6, 1.16, -0.36, 0.7);
  s.bezierCurveTo(-0.26, 0.36, -0.14, 0.16, 0, 0);
  return s;
}

/** A dot: the filler that gives real mehndi its rhythm. */
export function dropShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.16, 0, Math.PI * 2, false);
  return s;
}

/** Cone of rolled cellophane the paste is piped from. */
export function coneGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector2(0.015 + Math.pow(t, 1.3) * 0.4, t * 1.9));
  }
  return new THREE.LatheGeometry(pts, 24);
}

export type MotifKind = "petal" | "paisley" | "drop";
export type MotifMaterial = "gold" | "henna" | "leaf";

type RingSpec = {
  count: number;
  radius: number;
  scale: number;
  tilt: number;
  offset: number;
  kind: MotifKind;
  material: MotifMaterial;
};

/** Concentric rings, read outward: the order a mandala is actually drawn in. */
export const RINGS: RingSpec[] = [
  { count: 6, radius: 0.0, scale: 0.62, tilt: 0, offset: 0, kind: "petal", material: "gold" },
  { count: 8, radius: 0.72, scale: 0.62, tilt: 0.1, offset: 0.4, kind: "petal", material: "henna" },
  { count: 12, radius: 1.5, scale: 0.7, tilt: 0, offset: 0, kind: "paisley", material: "gold" },
  { count: 16, radius: 2.42, scale: 0.34, tilt: 0.06, offset: 0.2, kind: "drop", material: "gold" },
  { count: 18, radius: 2.96, scale: 0.78, tilt: 0, offset: 0, kind: "petal", material: "henna" },
  { count: 24, radius: 3.92, scale: 0.3, tilt: 0, offset: 0.5, kind: "drop", material: "leaf" },
];

export const GUIDE_RINGS = [1.18, 2.18, 3.46, 4.3];

/** Where the camera sits. Shared so the framing maths cannot drift from it. */
export const CAMERA = { z: 9.5, fov: 42 } as const;

/** Outermost thing a viewer reads as part of the mandala. */
export const MANDALA_RADIUS = Math.max(...GUIDE_RINGS) + 0.1;

/** Half the world-space height the camera can see at the mandala's depth. */
export const VISIBLE_HALF_HEIGHT = CAMERA.z * Math.tan((CAMERA.fov * Math.PI) / 360);

/**
 * Fits the composition to the viewport.
 *
 * The field of view is vertical, so a narrow screen sees a narrow slice of the
 * world: on a phone the visible width is about 1.7 units against a mandala
 * radius of 4.4, which crops away 60% of the design and leaves a viewer
 * looking at an anonymous middle. Scaling by the visible half-width puts the
 * whole mandala back on screen at any aspect ratio.
 *
 * A wide screen returns exactly { scale: 1, y: 0 } — the composition it was
 * drawn for, deliberately bleeding off the top and bottom, is left alone.
 */
export function heroFit(aspect: number) {
  const halfWidth = VISIBLE_HALF_HEIGHT * aspect;
  const scale = Math.min(1, Math.max(0.34, halfWidth / MANDALA_RADIUS));
  // Once it has to shrink, it also drops toward the lower half of the hero, so
  // a narrow screen is not asking the headline and the mandala to share pixels.
  // Guarded rather than computed, so a wide screen gets 0 and not -0.
  const y = scale === 1 ? 0 : -(1 - scale) * 2.6;
  return { scale, y };
}

export type Motif = {
  key: string;
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  kind: MotifKind;
  material: MotifMaterial;
  /** Seconds to wait before this motif draws itself in. */
  delay: number;
};

/**
 * Places every motif on its ring. A motif at angle `a` is rotated by
 * `a - PI/2` so its +Y tip points radially outward.
 */
export function mandalaMotifs(): Motif[] {
  const out: Motif[] = [];
  RINGS.forEach((ring, ri) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.offset;
      out.push({
        key: `${ri}-${i}`,
        pos: [Math.cos(a) * ring.radius, Math.sin(a) * ring.radius, Math.sin(a * 3) * ring.tilt],
        rot: [ring.tilt, 0, a - Math.PI / 2],
        scale: ring.scale,
        kind: ring.kind,
        material: ring.material,
        // outer rings land last, so the mandala grows the way it is drawn
        delay: ri * 0.22 + (i / ring.count) * 0.42,
      });
    }
  });
  return out;
}

/**
 * When the last motif finishes arriving. After this the instance matrices are
 * final, so the per-frame write can stop for good.
 */
export const DRAW_IN_END = 0.25 + (RINGS.length - 1) * 0.22 + 0.42 + 0.85;

export type MotifBatch = {
  key: string;
  kind: MotifKind;
  material: MotifMaterial;
  motifs: Motif[];
};

/**
 * Groups the motifs by geometry + material. Each batch becomes one
 * InstancedMesh, so the mandala costs 5 draw calls instead of 84.
 */
export function motifBatches(): MotifBatch[] {
  const batches = new Map<string, MotifBatch>();
  for (const motif of mandalaMotifs()) {
    const key = `${motif.kind}:${motif.material}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { key, kind: motif.kind, material: motif.material, motifs: [] };
      batches.set(key, batch);
    }
    batch.motifs.push(motif);
  }
  return [...batches.values()];
}

/** Eased 0..1 draw-in progress for one motif at time `t`. */
export function drawIn(t: number, delay: number) {
  const p = Math.min(1, Math.max(0, (t - 0.25 - delay) / 0.85));
  return 1 - Math.pow(1 - p, 4);
}
