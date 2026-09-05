"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { startingTier } from "@/lib/scene-quality";
import { useTheme } from "./theme";

// Three.js is ~1MB of JavaScript. Keep it out of first paint entirely.
const Scene3D = dynamic(() => import("./scene-3d"), { ssr: false });

/** One small hook, used for the motion and starting-tier questions. */
function useMedia(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  // Server snapshot is `false`: the scene does not exist there anyway.
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Some devices and some corporate policies simply have no WebGL. */
function hasWebGL() {
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Fixed backdrop for the whole page. Sits behind the content and never takes
 * pointer events, so links, scrolling and text selection behave normally —
 * and so react-three-fiber's raycaster never sees a pointer move.
 */
export default function Scene() {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const coarse = useMedia("(pointer: coarse)");
  const small = useMedia("(max-width: 767px)");
  const theme = useTheme();

  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    // No WebGL: stay on the CSS backdrop below, which is built to stand alone.
    if (!hasWebGL()) return;
    // Give the hero text its paint and its entrance animation before WebGL
    // starts competing for the main thread. Compiling shaders and baking the
    // environment map during the first 250ms is what makes a hero feel heavy.
    const timer = window.setTimeout(() => setReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div aria-hidden className="scene-ground pointer-events-none fixed inset-0 -z-10 bg-ink">
      {ready && !lost && (
        <div className="scene-fade size-full">
          <Scene3D
            still={reduced}
            theme={theme}
            initialTier={startingTier({ coarsePointer: coarse, smallScreen: small })}
            onContextLost={() => setLost(true)}
          />
        </div>
      )}
    </div>
  );
}
