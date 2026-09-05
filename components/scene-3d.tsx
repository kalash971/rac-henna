"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import {
  CAMERA,
  DRAW_IN_END,
  EXTRUDE,
  GUIDE_RINGS,
  type MotifBatch,
  coneGeometry,
  drawIn,
  dropShape,
  heroFit,
  motifBatches,
  paisleyShape,
  petalShape,
} from "@/lib/henna-geometry";
import { MAX_DUST, TIERS, type Tier, downgrade, dprFor } from "@/lib/scene-quality";
import type { Theme } from "@/lib/theme";

/**
 * Every 3D asset here is built from curves at runtime — no model files, no CDN
 * fetch, no licence. The shapes and layout live in lib/henna-geometry.ts.
 */

/** Soft round sprite so gold dust reads as light, not as square pixels. */
function dustTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,242,214,1)");
  g.addColorStop(0.35, "rgba(217,169,76,0.55)");
  g.addColorStop(1, "rgba(217,169,76,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ *
 * Pointer
 *
 * One passive window listener writing into a ref — deliberately NOT
 * react-three-fiber's own pointer. r3f's event system raycasts the scene on
 * every pointermove; against extruded mandala geometry that is milliseconds
 * of work per event, many times per frame, for a scene where nothing is
 * clickable. The canvas also sits inside a `pointer-events: none` wrapper and
 * sets no `eventSource`, so r3f's handlers never fire at all.
 *
 * Writing to a ref (not state) means mouse movement triggers no React render
 * and no extra frames: the render loop just samples the latest value.
 * ------------------------------------------------------------------ */

type Pointer = { x: number; y: number };

function usePointer(enabled: boolean) {
  const pointer = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    // Touch devices have no hover, and following pointermove during a scroll
    // drag would swing the mandala around under the visitor's thumb.
    if (!enabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);

  return pointer;
}

/** Viewport size, sampled on a debounced resize rather than every event. */
function useViewport() {
  const [size, setSize] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio,
  }));

  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => setSize({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }),
        200
      );
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}

/**
 * Whether the scene is worth rendering: the hero on screen, tab in front.
 * Below the hero the mandala sits behind a near-opaque scrim, so parking it is
 * invisible and hands the whole GPU back to scrolling the rest of the page.
 */
function useSceneVisible() {
  const [onScreen, setOnScreen] = useState(true);
  const [backgrounded, setBackgrounded] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    const observer = hero
      ? new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0 })
      : null;
    observer?.observe(hero!);

    const onVisibility = () => setBackgrounded(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return onScreen && !backgrounded;
}

/**
 * How the scene reads in each palette.
 *
 * Bloom is nearly free visually on ivory — a glow needs something darker to
 * bloom against — so on the light theme it is dialled down to just the gem and
 * the gold highlights, which also hands back the frame time.
 */
const LOOK: Record<Theme, {
  ground: string;
  ambient: number;
  directional: number;
  rim: number;
  /** Metal needs an environment to look like metal; on ivory it reads black. */
  metalness: number;
  bloomScale: number;
  bloomThreshold: number;
  vignette: number;
}> = {
  dark: {
    ground: "#120a07",
    ambient: 0.38,
    directional: 1.6,
    rim: 40,
    metalness: 1,
    bloomScale: 1,
    bloomThreshold: 0.22,
    vignette: 0.68,
  },
  light: {
    ground: "#fbf6ee",
    // 0.85 / 2.1 blew the gold out and silhouetted the petals into black blobs.
    ambient: 0.55,
    directional: 1.25,
    rim: 12,
    metalness: 0.45,
    bloomScale: 0.25,
    bloomThreshold: 0.75,
    vignette: 0.16,
  },
};

/**
 * Owns the background and fog colours so a theme change is eased rather than
 * snapped.
 *
 * The objects are declared, not assigned onto the scene, and only their colour
 * channels are mutated afterwards — `args` deliberately never changes, since a
 * new value there would replace the object and reintroduce the snap.
 */
function ThemeGround({ color, still }: { color: string; still: boolean }) {
  const background = useRef<THREE.Color>(null);
  const fog = useRef<THREE.Fog>(null);
  const target = useMemo(() => new THREE.Color(color), [color]);
  const invalidate = useThree((s) => s.invalidate);
  const [initial] = useState(color);

  // A theme change can land while the loop is parked below the fold, and with
  // reduced motion there is no running loop to ease on at all.
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const pump = () => {
      invalidate();
      if (++frames < (still ? 2 : 70)) raf = requestAnimationFrame(pump);
    };
    pump();
    return () => cancelAnimationFrame(raf);
  }, [target, still, invalidate]);

  useFrame((_, delta) => {
    const current = background.current;
    if (!current) return;

    if (still) {
      current.copy(target);
      fog.current?.color.copy(target);
      return;
    }
    if (current.equals(target)) return;

    current.lerp(target, 1 - Math.pow(0.002, Math.min(delta, 0.1)));
    fog.current?.color.copy(current);
  });

  return (
    <>
      <color ref={background} attach="background" args={[initial]} />
      <fog ref={fog} attach="fog" args={[initial, 9, 30]} />
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * One InstancedMesh per geometry+material pair: the whole mandala is 5 draw
 * calls instead of 84. Once the draw-in finishes the instance buffer is never
 * written again, so 84 matrix compositions per frame become zero.
 */
function MotifBatchMesh({
  batch,
  geometry,
  material,
  still,
}: {
  batch: MotifBatch;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  still: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const settled = useRef(false);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const invalidate = useThree((s) => s.invalidate);

  const write = useCallback(
    (t: number) => {
      const target = mesh.current;
      if (!target) return;
      for (let i = 0; i < batch.motifs.length; i++) {
        const m = batch.motifs[i];
        dummy.position.set(m.pos[0], m.pos[1], m.pos[2]);
        dummy.rotation.set(m.rot[0], m.rot[1], m.rot[2]);
        dummy.scale.setScalar(m.scale * drawIn(t, m.delay));
        dummy.updateMatrix();
        target.setMatrixAt(i, dummy.matrix);
      }
      target.instanceMatrix.needsUpdate = true;
    },
    [batch, dummy]
  );

  /**
   * Writes the matrices, and re-writes them whenever the mesh underneath is
   * rebuilt.
   *
   * `material` is part of <instancedMesh args>, so switching theme replaces the
   * material, which makes r3f construct a brand new InstancedMesh — with an
   * empty instance buffer. The draw-in had already finished, so nothing was
   * left to fill it in and every petal disappeared until a reload.
   *
   * Once settled it re-writes the finished pose rather than replaying the
   * two-and-a-half second draw-in on every toggle.
   */
  useEffect(() => {
    const formed = still || settled.current;
    settled.current = formed;
    write(formed ? DRAW_IN_END : 0);
    invalidate();
  }, [write, still, geometry, material, invalidate]);

  useFrame((state) => {
    if (settled.current) return;
    const t = state.clock.elapsedTime;
    write(t);
    if (t >= DRAW_IN_END) settled.current = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, batch.motifs.length]}
      // An InstancedMesh's bounds cover the base geometry only, so leaving
      // culling on can make the whole mandala vanish once it drifts off-centre.
      frustumCulled={false}
    />
  );
}

function Mandala({ still, metalness }: { still: boolean; metalness: number }) {
  const group = useRef<THREE.Group>(null);
  const batches = useMemo(() => motifBatches(), []);

  const geo = useMemo(
    () => ({
      petal: new THREE.ExtrudeGeometry(petalShape(), EXTRUDE),
      paisley: new THREE.ExtrudeGeometry(paisleyShape(), EXTRUDE),
      drop: new THREE.ExtrudeGeometry(dropShape(), { ...EXTRUDE, depth: 0.1 }),
    }),
    []
  );

  const mat = useMemo(
    () => ({
      gold: new THREE.MeshStandardMaterial({
        color: "#d9a94c",
        metalness,
        roughness: 0.22 + (1 - metalness) * 0.2,
        emissive: new THREE.Color("#5a3c0c"),
        emissiveIntensity: 0.35,
      }),
      henna: new THREE.MeshStandardMaterial({
        color: "#8f3016",
        metalness: 0.35 * metalness,
        roughness: 0.42,
        emissive: new THREE.Color("#3d0f06"),
        emissiveIntensity: 0.4,
      }),
      leaf: new THREE.MeshStandardMaterial({
        color: "#6f8a44",
        metalness: 0.3 * metalness,
        roughness: 0.5,
      }),
    }),
    [metalness]
  );

  useEffect(() => {
    const g = geo;
    const m = mat;
    return () => {
      Object.values(g).forEach((x) => x.dispose());
      Object.values(m).forEach((x) => x.dispose());
    };
  }, [geo, mat]);

  useFrame((state) => {
    if (!still && group.current) group.current.rotation.z = state.clock.elapsedTime * 0.045;
  });

  return (
    <group ref={group}>
      {batches.map((batch) => (
        <MotifBatchMesh
          key={batch.key}
          batch={batch}
          geometry={geo[batch.kind]}
          material={mat[batch.material]}
          still={still}
        />
      ))}

      {/* Thin gold guide rings: the layout geometry a mandala is built on.
          Slightly thicker than they look like they need to be — a sub-pixel
          ring crawls badly once antialiasing is traded away. */}
      {GUIDE_RINGS.map((r) => (
        <mesh key={r} material={mat.gold}>
          <torusGeometry args={[r, 0.018, 6, 90]} />
        </mesh>
      ))}

      {/* Centre gem */}
      <mesh position={[0, 0, 0.12]}>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial
          color="#f0d9a0"
          metalness={metalness}
          roughness={0.08 + (1 - metalness) * 0.2}
          emissive="#a2721c"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}

/** The applicator cone, tip loaded with paste. */
function Cone({ still, metalness }: { still: boolean; metalness: number }) {
  const geo = useMemo(() => coneGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <Float
      speed={still ? 0 : 1.1}
      rotationIntensity={still ? 0 : 0.35}
      floatIntensity={still ? 0 : 0.7}
    >
      <group position={[4.6, -1.5, 1.2]} rotation={[0.35, 0.4, -0.55]}>
        <mesh geometry={geo} rotation={[Math.PI, 0, 0]}>
          <meshStandardMaterial
            color="#2a1a12"
            metalness={0.45 * metalness}
            roughness={0.3 + (1 - metalness) * 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* paste at the tip, and the drop about to fall */}
        <mesh position={[0, 0.06, 0]}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshStandardMaterial color="#5c2010" roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.34, 0]} scale={[1, 1.5, 1]}>
          <sphereGeometry args={[0.05, 12, 8]} />
          <meshStandardMaterial color="#7a2a12" roughness={0.2} metalness={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

/** Fixed offsets rather than Math.random, so the composition stays the designed one. */
const MOTIF_PLACEMENT: [number, number, number, number, number][] = [
  [-5.4, 2.1, -2.4, 0.5, 0.9],
  [5.2, 2.8, -3.6, 0.42, -1.4],
  [-4.2, -2.9, -1.8, 0.34, 2.2],
  [3.4, -3.4, -4.2, 0.55, 0.3],
  [-6.4, -0.4, -5, 0.62, -0.7],
  [6.2, -0.8, -2.2, 0.3, 1.9],
];

/** Loose paisley motifs drifting through the depth of the scene. */
function Motifs({ count, still, metalness }: { count: number; still: boolean; metalness: number }) {
  const geo = useMemo(
    () => new THREE.ExtrudeGeometry(paisleyShape(), { ...EXTRUDE, depth: 0.05 }),
    []
  );
  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <>
      {MOTIF_PLACEMENT.slice(0, count).map(([x, y, z, s, r], i) => (
        <Float
          key={i}
          speed={still ? 0 : 0.6 + i * 0.12}
          rotationIntensity={still ? 0 : 0.5}
          floatIntensity={still ? 0 : 1.2}
        >
          <mesh geometry={geo} position={[x, y, z]} rotation={[0.2, 0.4, r]} scale={s}>
            <meshStandardMaterial
              color={i % 2 ? "#d9a94c" : "#8f3016"}
              metalness={(i % 2 ? 1 : 0.3) * metalness}
              roughness={i % 2 ? 0.25 : 0.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/**
 * Gold dust. The buffer is allocated once at the largest size any tier asks
 * for, and the tier's count is applied with setDrawRange — so dropping a tier
 * costs no reallocation and no GPU upload.
 */
function Dust({ count, still }: { count: number; still: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const tex = useMemo(() => dustTexture(), []);

  const positions = useMemo(() => {
    const a = new Float32Array(MAX_DUST * 3);
    for (let i = 0; i < MAX_DUST; i++) {
      // deterministic scatter in a shell around the mandala
      const t = i * 2.399963;
      const r = 4 + (((i * 37) % 100) / 100) * 7;
      a[i * 3] = Math.cos(t) * r * 0.9;
      a[i * 3 + 1] = Math.sin(t * 1.7) * r * 0.55;
      a[i * 3 + 2] = -2 + Math.sin(t * 0.6) * 6;
    }
    return a;
  }, []);

  useEffect(() => {
    ref.current?.geometry.setDrawRange(0, count);
  }, [count]);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((state) => {
    if (!ref.current || still) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.35;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.11}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.9}
      />
    </points>
  );
}

/**
 * Drives the composition from real document scroll, so the page keeps native
 * scrolling, working anchor links and keyboard paging.
 *
 * `scrollHeight`/`clientHeight` are measured on resize only. Reading them in a
 * scroll handler forces a synchronous layout on every scroll event, which is
 * its own source of stutter — and it is easy to miss because it shows up as
 * "scrolling is janky", not as a slow frame in the GPU profile.
 */
function ScrollRig({
  children,
  still,
  pointer,
}: {
  children: React.ReactNode;
  still: boolean;
  pointer: React.RefObject<Pointer>;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const range = useRef(1);

  useEffect(() => {
    const measure = () => {
      const el = document.documentElement;
      range.current = Math.max(1, el.scrollHeight - el.clientHeight);
    };
    // Deliberately does NOT invalidate: while the scene is parked, scrolling
    // must cost it nothing. The ref keeps tracking, so when the hero comes
    // back the loop resumes with the right target and eases into it over a
    // few frames instead of snapping.
    const read = () => {
      progress.current = Math.min(1, window.scrollY / range.current);
    };

    measure();
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", measure);
    // Page height also changes when the gallery filter runs.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = progress.current;
    // Frame-rate independent ease: a 144Hz display must not move four times
    // faster than a 30Hz one, and a long parked gap must not overshoot.
    const k = still ? 1 : 1 - Math.pow(0.001, Math.min(delta, 0.1));
    const px = still ? 0 : pointer.current.x;
    const py = still ? 0 : pointer.current.y;

    g.position.x = THREE.MathUtils.lerp(g.position.x, -s * 3.4 + px * 0.35, k);
    g.position.y = THREE.MathUtils.lerp(g.position.y, s * 2.2 - py * 0.25, k);
    g.position.z = THREE.MathUtils.lerp(g.position.z, -s * 7, k);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.14 + s * 0.55 - py * 0.12, k);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, px * 0.22 + s * 0.3, k);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, s * 1.1, k);
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Fits the composition to the viewport, and only ever shrinks it: a wide
 * screen gets scale 1 and no offset, exactly the framing this was drawn for.
 *
 * Wrapping ScrollRig rather than sitting inside it means the rig's own
 * translations are scaled too, so the mandala drifts proportionally on a phone
 * instead of leaving the frame after a few hundred pixels of scroll.
 */
function Fit({ children }: { children: React.ReactNode }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const { scale, y } = heroFit(width / Math.max(1, height));

  return (
    <group scale={scale} position={[0, y, 0]}>
      {children}
    </group>
  );
}

/** With reduced motion the scene is drawn a handful of times, then left alone. */
function SettleFrames() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    let raf = 0;
    const tick = () => {
      invalidate();
      if (++n < 12) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

export default function Scene3D({
  still,
  theme,
  initialTier,
  onContextLost,
}: {
  still: boolean;
  theme: Theme;
  initialTier: Tier;
  onContextLost: () => void;
}) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const spec = TIERS[tier];
  const look = LOOK[theme];
  const pointer = usePointer(!still);
  const viewport = useViewport();
  const visible = useSceneVisible();

  // Both of these are Canvas *props* on purpose. r3f re-applies `dpr` and
  // `frameloop` from props every time the Canvas renders, so calling
  // setDpr/setFrameloop from a child would be silently undone on the next
  // tier change. Deriving them here keeps prop and renderer in agreement.
  const dpr = dprFor(tier, viewport.w, viewport.h, viewport.dpr);
  const frameloop = still || !visible ? "demand" : "always";

  return (
    <Canvas
      // No eventSource, and the wrapper is pointer-events:none, so r3f never
      // raycasts on pointer movement. See usePointer above.
      frameloop={frameloop}
      dpr={dpr}
      camera={{ position: [0, 0, CAMERA.z], fov: CAMERA.fov }}
      // The canvas is position:fixed — it never needs re-measuring on scroll.
      resize={{ scroll: false, debounce: { scroll: 0, resize: 200 } }}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            // Keep the browser quiet and hand the page back to its CSS backdrop.
            e.preventDefault();
            onContextLost();
          },
          { once: true }
        );
      }}
    >
      <ThemeGround color={look.ground} still={still} />

      {/* Three lights, not five. Each one is another shader variant and another
          per-pixel cost across the whole frame; the metal reads from the env. */}
      <ambientLight intensity={look.ambient} color="#ffe9c4" />
      <directionalLight position={[5, 8, 6]} intensity={look.directional} color="#fff2d8" />
      <pointLight position={[-6, -3, 4]} intensity={look.rim} color="#b8431c" distance={18} />

      {/* Reflections come from lightformers, not a downloaded HDR. Baked once. */}
      <Environment resolution={spec.envResolution} frames={1}>
        <Lightformer form="ring" intensity={3} color="#f0d9a0" scale={9} position={[0, 5, -8]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#b8431c" scale={[12, 5, 1]} position={[-8, -2, -4]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={2.2} color="#fff4de" scale={5} position={[6, 3, 4]} target={[0, 0, 0]} />
      </Environment>

      <Fit>
        <ScrollRig still={still} pointer={pointer}>
          <Mandala still={still} metalness={look.metalness} />
          {theme === "dark" && <Cone still={still} metalness={look.metalness} />}
          <Motifs count={spec.motifs} still={still} metalness={look.metalness} />
          <Dust count={spec.dust} still={still} />
        </ScrollRig>
      </Fit>

      {still && <SettleFrames />}

      {/* Measured frame rate is the only honest signal about an unknown GPU.
          Downgrades are one-way: a tier that oscillates looks worse than the
          lower of the two. Pointless while the loop is parked. */}
      {!still && visible && (
        <PerformanceMonitor
          ms={250}
          iterations={6}
          onDecline={() => setTier(downgrade)}
          onFallback={() => setTier("low")}
        />
      )}

      {/* Unmounted rather than disabled at the bottom tier: that frees a
          full-resolution float render target and the bloom mip chain, which is
          exactly the memory a struggling device needs back. Downgrades never
          reverse, so nothing has to be rebuilt afterwards. */}
      {spec.effects && (
        <EffectComposer enableNormalPass={false} multisampling={spec.multisampling}>
          <Bloom
            intensity={spec.bloomIntensity * look.bloomScale}
            luminanceThreshold={look.bloomThreshold}
            luminanceSmoothing={0.35}
            mipmapBlur
            // The downsample chain is the expensive half of this frame.
            resolutionScale={spec.bloomScale}
          />
          {/* postprocessing merges effects into a single pass, so a vignette at
              darkness 0 costs a few ALU ops — cheaper than the shader rebuild
              that adding and removing it would cost. */}
          <Vignette offset={0.28} darkness={spec.vignette ? look.vignette : 0} eskil={false} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
