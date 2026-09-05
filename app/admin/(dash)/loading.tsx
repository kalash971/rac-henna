/**
 * Shown while the Mongo query runs. Both dashboard pages are force-dynamic, so
 * without this a navigation sat on a blank panel for the length of a round
 * trip to Atlas.
 *
 * The shapes match the real cards, so nothing jumps when the data lands.
 */
export default function DashLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="shimmer h-10 w-48 rounded-xl" />
      <div className="shimmer mt-3 h-4 w-full max-w-md rounded" />

      <div className="mt-8 flex flex-wrap gap-2">
        {[64, 82, 96, 78, 70].map((w, i) => (
          <div
            key={w}
            className="shimmer rise h-11 rounded-full"
            style={{ width: w, ["--i" as string]: i }}
          />
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="rise rounded-3xl border border-line bg-ink-2 p-5 sm:p-6"
            style={{ ["--i" as string]: i + 2 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="shimmer h-7 w-40 rounded-lg" />
                <div className="shimmer mt-2 h-3 w-24 rounded" />
              </div>
              <div className="shimmer h-11 w-28 rounded-full" />
            </div>
            <div className="shimmer mt-5 h-4 w-2/3 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="shimmer h-11 w-36 rounded-full" />
              <div className="shimmer h-11 w-24 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
