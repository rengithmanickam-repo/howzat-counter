import { Injectable, signal } from '@angular/core';
import { applyThemeToDocument } from './theme-init';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'howzat-counter/theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>('system');
  readonly effectiveTheme = signal<EffectiveTheme>('light');

  private mediaQuery: MediaQueryList | null = null;
  private onSystemChange: ((ev: MediaQueryListEvent) => void) | null = null;

  init(): void {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      this.preference.set(saved);
    }

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.onSystemChange = () => this.apply();
    this.mediaQuery.addEventListener('change', this.onSystemChange);
    this.apply();
  }

  setPreference(pref: ThemePreference): void {
    this.preference.set(pref);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch { /* ignore */ }
    this.apply();
  }

  /** Toggle explicit light/dark (leaves system preference when first used from system). */
  toggleTheme(): void {
    this.setPreference(this.effectiveTheme() === 'dark' ? 'light' : 'dark');
  }

  private resolveEffective(): EffectiveTheme {
    const pref = this.preference();
    if (pref === 'light') return 'light';
    if (pref === 'dark') return 'dark';
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private apply(): void {
    const effective = this.resolveEffective();
    this.effectiveTheme.set(effective);
    applyThemeToDocument(effective);
  }
}
