import {
  applyTheme,
  hasExplicitThemeChoice,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
} from './theme';

describe('resolveInitialTheme', () => {
  it('prefers a saved choice over the system preference', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark');
    expect(resolveInitialTheme('light', true)).toBe('light');
  });

  it('falls back to the system preference when nothing is saved', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme(null, false)).toBe('light');
  });

  it('ignores a corrupted saved value instead of locking the UI', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark');
    expect(resolveInitialTheme('banana', false)).toBe('light');
    expect(resolveInitialTheme('', false)).toBe('light');
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('toggles the .dark class on <html>', () => {
    applyTheme('dark', false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyTheme('light', false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists only when asked, so system-driven changes stay non-sticky', () => {
    applyTheme('dark', false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(hasExplicitThemeChoice()).toBe(false);
    applyTheme('dark', true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(hasExplicitThemeChoice()).toBe(true);
  });
});
