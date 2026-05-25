import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { THEME_STORAGE_KEY } from './theme.service';

const MIGRATION_KEY = 'howzat-counter/prefs-migrated-v1';

/** Keys previously stored in WebView localStorage; migrated to Capacitor Preferences on first launch. */
export const PREFERENCES_MIGRATION_KEYS = [
  THEME_STORAGE_KEY,
  'umpireAppPrefs',
  'umpireCounterV1',
  'umpireCounterV2',
  'umpireSetupDefaults',
  'howzat_update_skipped_version',
  'howzat_update_last_check_ms'
] as const;

@Injectable({ providedIn: 'root' })
export class PreferencesStorageService {
  private initialized = false;
  private readonly cache = new Map<string, string>();

  /** Run once at startup before other services read persisted data. */
  async init(): Promise<void> {
    if (this.initialized) return;

    const migrated = await Preferences.get({ key: MIGRATION_KEY });
    if (migrated.value !== '1') {
      for (const key of PREFERENCES_MIGRATION_KEYS) {
        try {
          const fromWeb = localStorage.getItem(key);
          if (fromWeb == null) continue;
          const existing = await Preferences.get({ key });
          if (existing.value == null) {
            await Preferences.set({ key, value: fromWeb });
          }
        } catch { /* ignore */ }
      }
      await Preferences.set({ key: MIGRATION_KEY, value: '1' });
    }

    for (const key of PREFERENCES_MIGRATION_KEYS) {
      try {
        const { value } = await Preferences.get({ key });
        if (value != null) {
          this.cache.set(key, value);
          if (key === THEME_STORAGE_KEY) {
            try { localStorage.setItem(key, value); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }

    this.initialized = true;
  }

  getItem(key: string): string | null {
    if (this.cache.has(key)) return this.cache.get(key)!;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    void Preferences.set({ key, value }).catch(() => { /* ignore */ });
    if (key === THEME_STORAGE_KEY) {
      try { localStorage.setItem(key, value); } catch { /* ignore */ }
    }
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    void Preferences.remove({ key }).catch(() => { /* ignore */ });
    if (key === THEME_STORAGE_KEY) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  }
}
