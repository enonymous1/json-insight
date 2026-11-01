/**
 * Dark-theme helpers, kept free of Angular APIs like json-analysis.ts so
 * they can be unit-tested in isolation.
 *
 * Precedence, highest first:
 * 1. An explicit choice saved in localStorage (set by the header toggle).
 * 2. The operating system's preference (`prefers-color-scheme: dark`).
 *
 * The preference is stored locally only — the app makes no network
 * request for user data, and the theme is no exception. The storage key
 * is duplicated in the inline script in src/index.html, which must run
 * before the first paint to avoid a light-to-dark flash; keep the two
 * copies of the key in sync if it ever changes.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'json-insight-theme';

/**
 * Resolve the starting theme. `stored` is the raw localStorage value (or
 * null when nothing was saved, or storage is unavailable); only the exact
 * strings 'dark' and 'light' count as a choice, anything else falls back
 * to the system preference so a corrupted value cannot lock the UI into
 * an unreadable state.
 */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  return prefersDark ? 'dark' : 'light';
}

/** Read the starting theme from the browser, guarding every unavailable API. */
export function readInitialTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Private mode / blocked storage: fall through to the system preference.
    stored = null;
  }
  let prefersDark = false;
  try {
    prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    prefersDark = false;
  }
  // The pre-boot script in index.html applied this same decision to
  // <html> before the first paint, so this normally agrees with the
  // class already on the document; App applies it again on init (without
  // persisting) to cover the case where the script did not run.
  return resolveInitialTheme(stored, prefersDark);
}

/**
 * Apply a theme to the document. Callers pass `persist` false when the
 * change came from the system (so the system can keep driving the theme
 * until the user makes an explicit choice) and true when it came from
 * the toggle button.
 */
export function applyTheme(theme: Theme, persist: boolean): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // Keep the mobile browser chrome colour in step with the header:
  // #2d3748 is the light-mode header, #171923 the dark-mode one.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#171923' : '#2d3748');
  }
  if (!persist) {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: the theme still applies for this session.
  }
}

/** True when an explicit choice is saved, i.e. system changes should be ignored. */
export function hasExplicitThemeChoice(): boolean {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' || stored === 'light';
  } catch {
    return false;
  }
}
