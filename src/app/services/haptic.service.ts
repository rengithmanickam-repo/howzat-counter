import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class HapticService {
  async lightTap(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* plugin unavailable */
    }
  }

  async mediumTap(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      /* plugin unavailable */
    }
  }
}
