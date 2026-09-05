/**
 * Theme plumbing shared by the inline boot script and the React toggle.
 *
 * No directive on this file: the root layout is a Server Component and needs
 * the script string, while components/theme.tsx needs the key on the client.
 */

export type Theme = "dark" | "light";

export const THEME_KEY = "rac-theme";

/**
 * Runs before the body paints, so there is no flash of the wrong palette.
 *
 * Respects the system preference when nothing has been chosen. To ship
 * dark-first regardless, drop the matchMedia branch and default to "dark".
 */
export const themeBootScript = `
(function(){try{
  var stored = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  var theme = stored === "light" || stored === "dark" ? stored
    : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = theme;
}catch(e){
  document.documentElement.dataset.theme = "dark";
}})();
`.trim();
