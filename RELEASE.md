# Release checklist — Howzat Counter

## Version 1.3.0 (build 4)

### What’s new
- Virtual coin toss with a rich 3D animated quarter (in match setup)
- Match setup now opens as a native-style bottom sheet
- Dark mode with manual theme toggle on all screens
- Help tab with step-by-step visual guides (no external diagrams)
- Score toasts for 4, 6 & wicket (top of screen; optional in Settings)
- History overs list full width; most recent overs first
- Status bar follows light/dark theme on iOS
- Reset match uses native action sheet
- Preferences stored via Capacitor (migrated from WebView storage)
- iPhone locked to portrait; privacy manifest for App Store

### Version sync (keep aligned)

| Location | Value |
|----------|--------|
| `package.json` | `1.3.0` |
| Xcode **Marketing Version** | `1.3` |
| Xcode **Build** (`CURRENT_PROJECT_VERSION`) | `4` |
| `latest-version.json` | `"1.3.0"` |

### Build & deploy (iOS)

```bash
cd /Users/rm/Documents/app/howzat_counter
npm install
npm run build:ios
npm run cap:open:ios
```

In Xcode:
1. Confirm **Marketing Version** = `1.3`, **Build** = `4`
2. **Product → Archive**
3. **Distribute App** → App Store Connect
4. In App Store Connect → **What's New**:

```
• New: virtual coin toss to start the match with a 3D animated coin
• Match setup now slides up as a modern bottom sheet
• Dark mode and theme toggle — match your device or choose light/dark
• Redesigned Help with clear step-by-step guides
• Optional score toasts for fours, sixes and wickets
• History and Live Scoring layout improvements
• Faster, more reliable saved settings on iOS
```

5. After release, ensure `latest-version.json` on `main` is `"1.3.0"`

### App Store Connect

- **Bundle ID:** `com.howzat.counter`
- Answer **Export Compliance:** No custom encryption (`ITSAppUsesNonExemptEncryption` = NO)
- **Build number** must increase for every upload
