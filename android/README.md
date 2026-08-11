# Resume ATS Android

Kotlin + Jetpack Compose client for https://resume.tomorrowtools.dev

## Setup
1. Open this `android/` folder in Android Studio (Giraffe+).
2. Set `GOOGLE_WEB_CLIENT_ID` in `app/build.gradle.kts` to your Google OAuth **Web** client ID.
3. Register Android OAuth client: package `dev.tomorrowtools.resume` + debug/release SHA-1.
4. On the server, allow that client id via `GOOGLE_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_IDS`.
5. Optional API override in `local.properties`: `resume.api.baseUrl=https://…`

## Emulator networking
Some AVDs fail HTTPS to Cloudflare when Wi‑Fi is on (TCP `ENETUNREACH` from dual-stack `::` even though ping works). Fix for local QA:

```bash
adb shell svc wifi disable
```

The app also prefers IPv4 DNS + IPv4-bound sockets. Re-enable Wi‑Fi after testing if needed.

## Flows
Sign-in → Prepare → Analyse (dimensions, replace workbench) → Tailor (gauges + versions) → Career Brand → Builder/PDF → Profile/sessions

## Deep links
- App: `https://resume.tomorrowtools.dev/app`, `ttresume://open`
- Sibling MPI: prefers `ttmpi://open`, falls back to https

## Release signing (Play / production)

1. Create a release keystore (keep offline; never commit).
2. Copy `keystore.properties.example` → `keystore.properties` and fill values.
3. `./gradlew :app:assembleRelease` (or Android Studio Generate Signed Bundle).
4. Upload the **AAB** to Play Console. Prefer Play App Signing.

Debug APKs remain for sideload/Manager only — not for Play production.

## Privacy / backup

- `android:allowBackup="false"` (tokens must not land in cloud backup).
- Public policy: https://resume.tomorrowtools.dev/privacy

## Current debug APK metadata

| Field | Value |
|-------|-------|
| versionCode | 11 |
| versionName | 1.0.7-play-prep |
| targetSdk | 36 |
| Download | https://resume.tomorrowtools.dev/downloads/resume-ats-debug.apk |
| Manifest | https://resume.tomorrowtools.dev/downloads/apps-manifest.json (includes sha256) |

Publish: bump versions → assemble → copy APK → `sha256sum` into `apps-manifest.json` → deploy web.
