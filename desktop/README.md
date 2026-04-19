# TrackAll Desktop

Native Electron wrapper for the TrackAll delivery tracker web app, adding system tray, native notifications, deep-link protocol handling, and auto-updates.

## Prerequisites

- Node.js 18+
- The TrackAll web app running (`frontend` on port 3000, `backend` on port 4000)

## Development

```bash
cd desktop
npm install
npm run dev          # launches Electron pointed at http://localhost:3000
```

DevTools open automatically in dev mode.

## Building

```bash
npm run build:win    # NSIS installer + portable .exe
npm run build:mac    # .dmg + .zip
npm run build:linux  # AppImage + .deb + .rpm
npm run build:all    # all platforms
```

Output goes to `desktop/dist/`.

> **Icons** — place `assets/icon.ico`, `assets/icon.icns`, `assets/icon.png`, `assets/tray.png` before building (see `assets/README.md`).

## Deep Link Protocol

Register `trackall://` URLs to open a specific shipment:

```
trackall://track/SHIP123
```

The app receives the URL via the `window.trackall.onDeepLink(cb)` API and can route to the correct page.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TRACKALL_APP_URL` | `http://localhost:3000` | Frontend URL to load |
| `ELECTRON_IS_DEV` | `0` | Set to `1` for dev mode |
| `GH_TOKEN` | — | GitHub token for auto-updater |

Copy `.env.example` → `.env` and adjust.

## System Tray

- **Double-click** tray icon → show/focus window
- **Context menu**: Open TrackAll · Check for Updates · Quit
- Badge shows active delivery count (macOS dock + Windows taskbar overlay)
- Closing the window minimizes to tray (configurable via `minimizeToTray` in store)

## Auto-Updater

Uses `electron-updater` with GitHub Releases as the update source (`mahak867/deliviery-monitor`). On launch (after 3 s), it silently checks for updates and prompts the user to restart when a new version is downloaded.

## Preload API (`window.trackall`)

| Property/Method | Description |
|---|---|
| `isDesktop` | Always `true` — detect desktop env |
| `platform` | `win32` / `darwin` / `linux` |
| `version` | App version string |
| `onDeepLink(cb)` | Register deep-link handler |
| `showNotification(title, body)` | Trigger native OS notification |
| `openExternal(url)` | Open URL in default browser |
| `minimize()` | Minimize window to tray |
| `updateBadge(n)` | Set delivery count badge |
| `getDeliveries()` | Fetch shipments from backend |
