/**
 * Deterministic mandala line-art, drawn from a seed.
 *
 * ponytail: this exists so the gallery reads as finished instead of as grey
 * boxes. When the real photographs arrive, swap the <MandalaArt> call in
 * components/sections.tsx for next/image and delete this file.
 */

/** mulberry32 — same seed, same design, on server and client. */
function rng(seed: number) {
  let a = seed * 0x6d2b79f5 + 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sub-0.1 precision is invisible in a 400x500 viewBox and triples the markup. */
const n = (v: number) => Math.round(v * 10) / 10;

/** A leaf pointing outward from the centre, its base at radius r. */
function petal(r: number, len: number, w: number) {
  const c1 = n(-r - len * 0.28);
  const c2 = n(-r - len * 0.78);
  return [
    `M0 ${n(-r)}`,
    `C${n(w)} ${c1} ${n(w * 0.82)} ${c2} 0 ${n(-r - len)}`,
    `C${n(-w * 0.82)} ${c2} ${n(-w)} ${c1} 0 ${n(-r)}`,
    "Z",
  ].join("");
}

export function MandalaArt({ seed, className }: { seed: number; className?: string }) {
  const r = rng(seed);
  const uid = `m${seed}`;
  const ink = "#5b2409";
  const rings = 3 + Math.floor(r() * 3);

  return (
    <svg
      viewBox="0 0 400 500"
      className={className}
      role="presentation"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eed3b4" />
          <stop offset="55%" stopColor="#dfb894" />
          <stop offset="100%" stopColor="#c9976e" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#e5c3a0" />
      <rect width="400" height="500" fill={`url(#${uid}-skin)`} opacity="0.9" />

      <g transform="translate(200 215)" stroke={ink} fill="none" strokeLinecap="round">
        {/* centre bloom */}
        <circle r="9" fill={ink} stroke="none" />
        <circle r="18" strokeWidth="2" />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={`c${i}`}
            d={petal(20, 22, 8)}
            transform={`rotate(${i * 45})`}
            fill={ink}
            fillOpacity="0.85"
            stroke="none"
          />
        ))}

        {/* outward rings */}
        {Array.from({ length: rings }, (_, ri) => {
          const radius = 56 + ri * 34;
          const count = 8 + ri * 4 + Math.floor(r() * 4) * 2;
          const len = n(20 + r() * 16);
          const solid = r() > 0.55;
          return (
            <g key={`r${ri}`}>
              <circle r={radius - 8} strokeWidth={ri % 2 ? 1 : 2} opacity="0.75" />
              {Array.from({ length: count }, (_, i) => (
                <path
                  key={i}
                  d={petal(radius, len, len * 0.36)}
                  transform={`rotate(${n((i * 360) / count + ri * 7)})`}
                  strokeWidth="1.6"
                  fill={solid ? ink : "none"}
                  fillOpacity={solid ? 0.7 : 0}
                  opacity="0.9"
                />
              ))}
            </g>
          );
        })}

        {/* dotted outer band — the filler that gives mehndi its rhythm */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * Math.PI * 2) / 36;
          const rad = 56 + rings * 34 + 14;
          return (
            <circle
              key={`d${i}`}
              cx={n(Math.cos(a) * rad)}
              cy={n(Math.sin(a) * rad)}
              r={i % 3 === 0 ? 3.4 : 1.8}
              fill={ink}
              stroke="none"
              opacity="0.8"
            />
          );
        })}
      </g>

      {/* vine trailing off toward the wrist */}
      <g stroke={ink} fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.85">
        <path d="M200 400 C 168 424, 232 452, 200 482" />
        {Array.from({ length: 7 }, (_, i) => {
          const y = 396 + i * 13;
          const dir = i % 2 ? 1 : -1;
          return (
            <path
              key={`v${i}`}
              d={`M200 ${y} q ${dir * 26} ${-8} ${dir * 34} ${10}`}
              strokeWidth="1.5"
            />
          );
        })}
      </g>
    </svg>
  );
}
