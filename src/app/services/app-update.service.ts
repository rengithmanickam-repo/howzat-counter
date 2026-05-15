import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const BUNDLE_ID = 'com.howzat.counter';
const IOS_LOOKUP_URL = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}`;
/** Bump this in git on each release (raw file). Used when App Store lookup is empty (e.g. Android or pre-publish). */
const REMOTE_VERSION_URL =
  'https://raw.githubusercontent.com/rengithmanickam-repo/howzat-counter/main/latest-version.json';

const STORAGE_SKIPPED = 'howzat_update_skipped_version';
const STORAGE_LAST_CHECK = 'howzat_update_last_check_ms';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours between checks

function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.+]/).map(n => parseInt(n, 10) || 0);
  const pb = b.split(/[.+]/).map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

interface RemoteVersionPayload {
  latestVersion?: string;
}

interface IOSLookupResult {
  results?: Array<{ version?: string; trackViewUrl?: string; trackId?: number }>;
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private checking = false;
  private alertOpen = false;

  private readonly alertController = inject(AlertController);

  /** Call once at startup; register resume listener. */
  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    void this.checkSilently();

    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void this.checkSilently();
    });
  }

  private shouldThrottleCheck(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_LAST_CHECK);
      if (!raw) return false;
      return Date.now() - parseInt(raw, 10) < CHECK_INTERVAL_MS;
    } catch {
      return false;
    }
  }

  private markChecked(): void {
    try {
      localStorage.setItem(STORAGE_LAST_CHECK, String(Date.now()));
    } catch { /* ignore */ }
  }

  private getSkippedVersion(): string | null {
    try {
      return localStorage.getItem(STORAGE_SKIPPED);
    } catch {
      return null;
    }
  }

  private setSkippedVersion(v: string): void {
    try {
      localStorage.setItem(STORAGE_SKIPPED, v);
    } catch { /* ignore */ }
  }

  async checkSilently(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.checking || this.alertOpen) return;
    if (this.shouldThrottleCheck()) return;

    this.checking = true;
    try {
      const info = await App.getInfo();
      const current = (info.version || '0').trim();
      if (!current) return;

      const iosMeta =
        Capacitor.getPlatform() === 'ios' ? await this.fetchIOSStoreMeta() : { latest: '', url: '' };

      let latest = iosMeta.latest;
      if (!latest) {
        latest = await this.fetchRemoteVersionJson();
      }

      if (!latest || compareSemver(latest, current) <= 0) {
        return;
      }

      const skipped = this.getSkippedVersion();
      if (skipped && compareSemver(latest, skipped) <= 0) {
        return;
      }

      let storeUrl = iosMeta.url;
      if (!storeUrl && Capacitor.getPlatform() === 'android') {
        storeUrl = `https://play.google.com/store/apps/details?id=${BUNDLE_ID}`;
      }

      const storeName =
        Capacitor.getPlatform() === 'ios' ? 'the App Store' : 'Google Play';

      await this.presentUpdateAlert(current, latest, storeUrl, storeName);
    } catch {
      /* network / plugin errors — ignore */
    } finally {
      this.checking = false;
      this.markChecked();
    }
  }

  private async fetchIOSStoreMeta(): Promise<{ latest: string; url: string }> {
    const res = await fetch(IOS_LOOKUP_URL, { cache: 'no-store' });
    if (!res.ok) return { latest: '', url: '' };
    const data = (await res.json()) as IOSLookupResult;
    const row = data.results?.[0];
    if (!row) return { latest: '', url: '' };
    const latest = (row.version || '').trim();
    const url =
      row.trackViewUrl?.trim() ||
      (row.trackId != null ? `https://apps.apple.com/app/id${row.trackId}` : '');
    return { latest, url };
  }

  private async fetchRemoteVersionJson(): Promise<string> {
    const res = await fetch(REMOTE_VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return '';
    const j = (await res.json()) as RemoteVersionPayload;
    return (j.latestVersion || '').trim();
  }

  private async presentUpdateAlert(
    current: string,
    latest: string,
    storeUrl: string,
    storeName: string
  ): Promise<void> {
    this.alertOpen = true;
    const hasLink = !!storeUrl.trim();
    const message = hasLink
      ? `Version ${latest} is available on ${storeName}. You are on ${current}. Update for the latest fixes and features.`
      : `Version ${latest} is available. You are on ${current}. Open ${storeName} manually to update.`;

    const alert = await this.alertController.create({
      header: 'Update available',
      message,
      buttons: hasLink
        ? [
            {
              text: 'Later',
              role: 'cancel',
              handler: () => this.setSkippedVersion(latest)
            },
            {
              text: 'Update',
              handler: () => {
                void this.openStore(storeUrl);
                this.setSkippedVersion(latest);
              }
            }
          ]
        : [{ text: 'OK', role: 'cancel', handler: () => this.setSkippedVersion(latest) }]
    });
    await alert.present();
    await alert.onDidDismiss();
    this.alertOpen = false;
  }

  private async openStore(url: string): Promise<void> {
    const u = url.trim();
    if (!u) return;
    try {
      await Browser.open({ url: u });
    } catch {
      window.open(u, '_blank', 'noopener');
    }
  }
}
