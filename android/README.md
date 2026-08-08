# Resume ATS Android

Kotlin + Jetpack Compose client for https://resume.tomorrowtools.dev

## Setup
1. Open this `android/` folder in Android Studio (Giraffe+).
2. Set `GOOGLE_WEB_CLIENT_ID` in `app/build.gradle.kts` to your Google OAuth **Web** client ID.
3. Register Android OAuth client: package `dev.tomorrowtools.resume` + debug/release SHA-1.
4. On the server, allow that client id via `GOOGLE_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_IDS`.

## Flows
Sign-in → Prepare → Analyse (dimensions, replace workbench) → Tailor (gauges + versions) → Career Brand → Builder/PDF → Profile/sessions

## Deep links
- App: `https://resume.tomorrowtools.dev/app`, `ttresume://open`
- Sibling MPI: prefers `ttmpi://open`, falls back to https
