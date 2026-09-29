# W3ctrl Track — Mobile Apps

Two Expo (React Native + TypeScript) apps in an npm-workspaces monorepo.
One language, one codebase pattern, both platforms (Android + iOS).

| App | Bundle ID | Purpose |
|---|---|---|
| `apps/customer` — **W3ctrl Track** | `com.w3ctrl.track` | Customer portal: dashboard, live map, devices, trips, geofences, alerts, reports, admin |
| `apps/tracker` — **W3ctrl Tracker** | `com.w3ctrl.tracker` | Install on any phone; turns it into a GPS tracker reporting to your server |

Shared code lives in `packages/`:

| Package | Contents |
|---|---|
| `@w3ctrl/api` | Traccar REST client (port of web `src/lib/traccar.ts`): Bearer-token auth via `POST /api/session/token`, devices/positions/events/trips/geofences/notifications/users/commands, `/track/` ingest helper, 38-alarm label map, `knotsToKmh`, geofence circle helpers |
| `@w3ctrl/theme` | Brand tokens ported from the web app (amber `#ff9900` signal colour, light + dark) |
| `@w3ctrl/i18n` | English + Hindi strings (same convention as web: keys are English, `en` dict is empty) |
| `@w3ctrl/ui` | Screen/Card/Button/Field/Badge/Segmented/EmptyState/LoadingView primitives, Lucide icons (no emojis), and `MapView` — MapLibre GL in a WebView with free CARTO tiles (no API keys) |

## Prerequisites

- Node 20.9+ (`/usr/bin/node`, **not** `/usr/local/bin/node` which is 20.8 — same rule as the web app)
- `npm install` from `mobile/` (workspaces; `@w3ctrl/*` resolve via root symlinks)
- For builds: an Expo account + EAS CLI (`npm i -g eas-cli`)

## Development

```bash
cd mobile/apps/customer   # or apps/tracker
npx expo start            # scan the QR with Expo Go, or press a/i for emulator
```

Typecheck: `npx tsc --noEmit` in either app (both are clean).

## Building binaries (APK / IPA)

This VM **cannot** produce APK/IPA files — that needs Apple's and Google's
build machines. Use EAS (Expo's cloud build), which is the standard route:

```bash
cd mobile/apps/customer        # or apps/tracker
eas build -p android           # APK/AAB via Google's builders
eas build -p ios               # IPA via Apple's builders (needs Apple Developer)
```

First run: `eas build:configure` creates `eas.json` (not committed yet —
profiles are yours to choose: `development` / `preview` / `production`).

### Store notes

- **Google Play**: one-time $25 developer fee. The tracker app declares
  background-location + foreground-service permissions — Play requires a
  prominent disclosure and a policy justification at submission; the
  SetupScreen already explains why location is needed before the OS prompt.
- **Apple App Store**: **₹8,800/year** Apple Developer Program membership,
  required before you can submit. "Always" location needs a clear purpose
  string (in `app.json`) — already written.
- The tracker app is also perfectly usable **sideloaded** (APK direct
  download) for family/staff phones without any store.

## How the apps talk to the server

- **Customer app** → `https://app.gpstracker.w3ctrl.com/api` (same Traccar
  API the web portal uses). Auth: `POST /api/session` (email+password, TOTP
  code field appears on `401` + `WWW-Authenticate: TOTP`), then mints a
  long-lived Bearer token via `POST /api/session/token` stored in
  SecureStore. Live updates are **polling** (15 s positions / 30 s events):
  Traccar's WebSocket authenticates via session cookie, which React Native
  doesn't manage — polling is the honest, reliable choice here.
- **Tracker app** → `https://gpstracker.w3ctrl.com/track/` (the OsmAnd
  ingest endpoint from Phase 3 — same one the laptop agent uses). Battery-
  aware interval, SOS sends `alarm=sos`. The device's unique ID must be
  **pre-registered** in Traccar first (the portal's `/app/devices/add`
  wizard does this, including the QR that encodes the `org.traccar.client:`
  provisioning URI).

## Backend prerequisites (server side, already deployed)

- nginx `/track/` → Traccar `:5055` (OsmAnd protocol) — live
- nginx `/api/` → Traccar `:8082` on `app.gpstracker.w3ctrl.com` — live
- `web.totpEnable=true` in `traccar.xml` + Traccar restart — needed for the
  customer app's 2FA screens to work (see the main runbook)

## Known limitations (honest list)

1. **No real-device testing yet.** Everything typechecks and the tracker
   app's logic is reviewed, but no simulator or phone was available here.
   Before any store submission: `expo run:android` / `run:ios`, real login
   + TOTP + engine-command smoke test, background-tracking overnight test.
2. **Android login may need a fix.** `loginWithToken` mints the Bearer token
   in a second request that relies on the `/session` cookie persisting.
   React Native on Android (OkHttp) doesn't persist cookies by default
   (iOS does). If login fails on a real Android device, the fix is to mint
   the token with a Basic-auth header instead of the cookie — one small
   change in `apps/customer/src/auth/AuthContext.tsx`.
3. **No boot auto-start.** `RECEIVE_BOOT_COMPLETED` is declared, but Expo
   managed workflow has no boot receiver without a config plugin — after a
   phone reboot, tracking stays off until the app is opened. Documented, not
   hidden; needs a config plugin or bare-workflow native module to fix.
4. **iOS "Always" location upgrade flow is untested** (no iOS device here).
5. **react-native-webview version split**: apps pin 13.15.0, the workspace
   root hoisted 14.0.1 (whose types the `ui` package resolves against).
   Runtime bundling looked fine in `expo export`; still, verify in a real
   EAS build.
6. **TOTP secret copy**: `expo-clipboard` was deliberately not added; the
   secret renders as selectable mono text with a long-press-to-copy hint.
7. **Plan gating is not applied to device types** (same as the web portal) —
   all plans can add phones/laptops today.
