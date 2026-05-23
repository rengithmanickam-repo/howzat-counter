# Release checklist — Howzat Counter

## Version 1.2.0 (build 3)

### What’s new
- In-app update prompts when a newer App Store version is available
- History tab shows most recent overs at the top

### Version sync (keep aligned)

| Location | Value |
|----------|--------|
| `package.json` | `1.2.0` |
| Xcode **Marketing Version** | `1.2` |
| Xcode **Build** (`CURRENT_PROJECT_VERSION`) | `3` |
| `latest-version.json` | `"1.2.0"` |

### Build & deploy (iOS)

```bash
cd /Users/rm/Documents/app/howzat_counter
npm install
npm run build:ios
npm run cap:open:ios
```

In Xcode:
1. Confirm **Marketing Version** = `1.2`, **Build** = `3`
2. **Product → Archive**
3. **Distribute App** → App Store Connect
4. In App Store Connect → **What's New**:

```
• History tab now shows your most recent overs at the top
• Optional update prompt when a new version is on the App Store
• Stability improvements
```

5. After release, ensure `latest-version.json` on `main` is `"1.2.0"` (already bumped in this release)

### App Store Connect

- **Bundle ID:** `com.howzat.counter`
- Answer **Export Compliance:** No custom encryption
- **Build number** must increase for every upload
