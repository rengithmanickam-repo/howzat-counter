import { THEME_STORAGE_KEY, type EffectiveTheme } from './theme.service';

/** Apply theme classes and document metadata (shared by bootstrap + ThemeService). */
export function applyThemeToDocument(effective: EffectiveTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = effective === 'dark';

  root.classList.toggle('theme-dark', isDark);
  root.classList.toggle('theme-light', !isDark);
  root.classList.toggle('ion-palette-dark', isDark);
  root.dataset['theme'] = effective;
  root.style.colorScheme = effective;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', isDark ? '#161618' : '#3880ff');
}

/** Runs before Angular bootstraps to avoid a flash of the wrong theme. */
export function initThemeBeforeBootstrap(): void {
  if (typeof window === 'undefined') return;

  const pref = localStorage.getItem(THEME_STORAGE_KEY);
  const effective: EffectiveTheme =
    pref === 'light' ? 'light'
    : pref === 'dark' ? 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  applyThemeToDocument(effective);
}
