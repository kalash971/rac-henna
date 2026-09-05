import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  DRAW_IN_END,
  MANDALA_RADIUS,
  VISIBLE_HALF_HEIGHT,
  heroFit,
  EXTRUDE,
  RINGS,
  coneGeometry,
  drawIn,
  dropShape,
  mandalaMotifs,
  motifBatches,
  paisleyShape,
  petalShape,
} from "./henna-geometry.ts";

/** A geometry with a NaN in it renders as nothing, silently. */
function assertFinite(g: THREE.BufferGeometry, label: string) {
  const pos = g.getAttribute("position");
  assert.ok(pos && pos.count > 8, `${label}: too few vertices (${pos?.count})`);
  for (let i = 0; i < pos.array.length; i++) {
    assert.ok(Number.isFinite(pos.array[i]), `${label}: non-finite vertex at ${i}`);
  }
  g.computeBoundingBox();
  const size = g.boundingBox!.getSize(new THREE.Vector3());
  assert.ok(size.x > 0.05 && size.y > 0.05, `${label}: collapsed to ${size.toArray()}`);
}

test("every motif extrudes to real, finite geometry", () => {
  for (const [label, shape] of [
    ["petal", petalShape()],
    ["paisley", paisleyShape()],
    ["drop", dropShape()],
  ] as const) {
    assertFinite(new THREE.ExtrudeGeometry(shape, EXTRUDE), label);
  }
  assertFinite(coneGeometry(), "cone");
});

test("the petal is symmetric about its own axis and points along +Y", () => {
  const g = new THREE.ExtrudeGeometry(petalShape(), EXTRUDE);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  assert.ok(Math.abs(b.min.x + b.max.x) < 0.01, "petal is lopsided in x");
  assert.ok(b.min.y < 0.05 && b.max.y > 0.9, "petal does not run base-to-tip along +Y");
});

test("all 84 motifs are placed on their ring at a finite position", () => {
  const motifs = mandalaMotifs();
  assert.equal(
    motifs.length,
    RINGS.reduce((n, r) => n + r.count, 0)
  );
  assert.equal(motifs.length, 84);

  for (const m of motifs) {
    assert.ok(m.pos.every(Number.isFinite), `${m.key} has a non-finite position`);
    assert.ok(m.rot.every(Number.isFinite), `${m.key} has a non-finite rotation`);
    assert.ok(m.scale > 0, `${m.key} would be invisible`);
  }
});

test("each motif sits on its ring radius and its tip points outward", () => {
  const motifs = mandalaMotifs();
  let at = 0;
  for (const ring of RINGS) {
    for (let i = 0; i < ring.count; i++) {
      const m = motifs[at++];
      const r = Math.hypot(m.pos[0], m.pos[1]);
      assert.ok(Math.abs(r - ring.radius) < 1e-9, `${m.key}: radius ${r} != ${ring.radius}`);

      // +Y rotated by rot.z must line up with the outward radial direction.
      const tip = new THREE.Vector3(0, 1, 0).applyAxisAngle(
        new THREE.Vector3(0, 0, 1),
        m.rot[2]
      );
      const angle = Math.atan2(m.pos[1], m.pos[0]);
      if (ring.radius > 0) {
        const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        assert.ok(tip.dot(radial) > 0.999, `${m.key}: tip points inward`);
      }
    }
  }
});

test("rings draw in from the centre outward", () => {
  const motifs = mandalaMotifs();
  const first = motifs[0].delay;
  const last = motifs[motifs.length - 1].delay;
  assert.ok(last > first, "outer ring should not land before the centre");
});

test("draw-in runs 0 to 1 and then stays put", () => {
  assert.equal(drawIn(0, 0), 0);
  assert.equal(drawIn(-5, 0), 0);
  assert.ok(drawIn(0.6, 0) > 0 && drawIn(0.6, 0) < 1);
  assert.equal(drawIn(99, 0), 1);
  // a delayed motif has not started while an undelayed one is already moving
  assert.equal(drawIn(0.6, 2), 0);
});

test("batching covers every motif and collapses to one draw call per material", () => {
  const batches = motifBatches();
  const total = batches.reduce((n, b) => n + b.motifs.length, 0);

  assert.equal(total, mandalaMotifs().length, "batching dropped or duplicated motifs");
  assert.ok(batches.length <= 6, `${batches.length} draw calls is more than expected`);
  assert.ok(batches.length < 10, "batching is not saving draw calls");

  for (const batch of batches) {
    assert.ok(batch.motifs.length > 0, `${batch.key} is an empty draw call`);
    // A batch is one InstancedMesh, so it must be uniform in both.
    assert.ok(
      batch.motifs.every((m) => m.kind === batch.kind && m.material === batch.material),
      `${batch.key} mixes geometry or material`
    );
  }

  const keys = batches.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate batch keys");
});

test("DRAW_IN_END is when the per-frame instance writes can actually stop", () => {
  const motifs = mandalaMotifs();

  // Every motif must be at full size by then, or the mandala freezes half-drawn.
  for (const m of motifs) {
    assert.equal(drawIn(DRAW_IN_END, m.delay), 1, `${m.key} is still growing at DRAW_IN_END`);
  }

  // And it must not be loose, or the loop keeps running for no reason.
  const last = Math.max(...motifs.map((m) => m.delay));
  assert.ok(
    DRAW_IN_END - (last + 0.25 + 0.85) < 0.1,
    "DRAW_IN_END has drifted well past the last motif"
  );
  assert.ok(drawIn(DRAW_IN_END - 0.1, last) < 1, "DRAW_IN_END is early enough to be wrong");
});

test("the extruded motifs stay cheap enough to instance 84 times", () => {
  const tris = (g: THREE.BufferGeometry) => g.getAttribute("position").count / 3;
  const petal = new THREE.ExtrudeGeometry(petalShape(), EXTRUDE);
  assert.ok(tris(petal) < 400, `petal is ${tris(petal)} triangles; that is too many to instance`);
  assert.equal(RINGS.reduce((n, r) => n + r.count, 0), 84);
});

/** Every viewport worth caring about, portrait and landscape. */
const VIEWPORTS: [string, number, number][] = [
  ["desktop 16:9", 1920, 1080],
  ["laptop 16:10", 1440, 900],
  ["small laptop", 1280, 800],
  ["iPad landscape", 1180, 820],
  ["iPad portrait", 820, 1180],
  ["iPhone 14", 390, 844],
  ["iPhone SE", 375, 667],
  ["tiny phone", 320, 568],
  ["phone landscape", 844, 390],
];

test("a wide screen is left exactly as designed", () => {
  for (const [name, w, h] of VIEWPORTS) {
    if (w / h < 1.25) continue;
    const fit = heroFit(w / h);
    assert.equal(fit.scale, 1, `${name} was rescaled`);
    assert.equal(fit.y, 0, `${name} was shifted`);
  }
});

test("the whole mandala is on screen at every aspect ratio", () => {
  for (const [name, w, h] of VIEWPORTS) {
    const aspect = w / h;
    const { scale } = heroFit(aspect);
    const halfWidth = VISIBLE_HALF_HEIGHT * aspect;
    assert.ok(
      scale * MANDALA_RADIUS <= halfWidth + 1e-9,
      `${name}: mandala radius ${(scale * MANDALA_RADIUS).toFixed(2)} exceeds the ` +
        `visible half-width ${halfWidth.toFixed(2)} — the design is cropped`
    );
  }
});

test("shrinking is monotonic in aspect, never upscaling", () => {
  let previous = 0;
  for (let aspect = 0.3; aspect <= 2.5; aspect += 0.05) {
    const { scale } = heroFit(aspect);
    assert.ok(scale >= previous - 1e-9, `scale fell going wider at aspect ${aspect}`);
    assert.ok(scale <= 1, `aspect ${aspect} upscaled past the designed size`);
    previous = scale;
  }
});

test("the drop stays inside the hero and only ever moves down", () => {
  for (let aspect = 0.2; aspect <= 2.5; aspect += 0.05) {
    const { y, scale } = heroFit(aspect);
    assert.ok(y <= 0, `aspect ${aspect} pushed the mandala up`);
    assert.ok(
      Math.abs(y) < VISIBLE_HALF_HEIGHT * 0.6,
      `aspect ${aspect} dropped the mandala ${(-y).toFixed(2)} units, most of the way off screen`
    );
    if (scale === 1) assert.equal(y, 0);
  }
});

test("an absurd aspect ratio still returns something drawable", () => {
  for (const aspect of [0.01, 0.1, 12, 100]) {
    const { scale, y } = heroFit(aspect);
    assert.ok(Number.isFinite(scale) && scale >= 0.34 && scale <= 1, `aspect ${aspect}: ${scale}`);
    assert.ok(Number.isFinite(y));
  }
});
