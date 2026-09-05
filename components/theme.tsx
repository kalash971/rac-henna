"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY, type Theme } from "@/lib/theme";

/**
 * The `data-theme` attribute on <html> *is* the state.
 *
 * The boot script sets it before paint, CSS reads it, and this hook observes
 * it — so there is no provider, no context, and no second copy of the truth
 * that could drift from what the page is actually showing.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark"
  );
}

/** Chrome, Edge and Safari 18 have this; Firefox does not yet. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "light" ? "dark" : "light";

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode — the choice just will not persist */
    }

    const apply = () => {
      root.dataset.theme = next;
    };

    const doc = document as ViewTransitionDocument;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (calm || typeof doc.startViewTransition !== "function") {
      // No snapshot available (or not wanted): transition the colours
      // themselves, but only for the length of the swap. Leaving that
      // transition on permanently would tax every hover and scroll after it.
      root.classList.add("theme-switching");
      apply();
      window.setTimeout(() => root.classList.remove("theme-switching"), 500);
      return;
    }

    // Wipe outward from the button that was pressed, to the far corner.
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);

    doc.startViewTransition(apply);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      // Both icons are always rendered and CSS picks one, so the markup does
      // not depend on JS and cannot mismatch during hydration. The label is
      // written to be true in either direction for the same reason.
      aria-label="Switch between the dark and light theme"
      title="Switch theme"
      className={`group relative flex size-11 items-center justify-center overflow-hidden rounded-full border border-line text-muted transition-colors hover:border-gold/60 hover:text-gold ${className}`}
    >
      <Moon
        className="theme-icon-dark size-[18px] transition-transform duration-500 group-hover:-rotate-12"
        aria-hidden
      />
      <Sun
        className="theme-icon-light size-[18px] transition-transform duration-500 group-hover:rotate-90"
        aria-hidden
      />
    </button>
  );
}
