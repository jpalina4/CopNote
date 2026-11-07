# CopNote — Digital Pocket Notebook for Police Officers

A Semester 2 university project (Papua New Guinea). CopNote replaces the
paper pocket notebook: officers log in, record daily incidents with supporting
photos, and save each page. A saved page is **locked** and a new blank page
opens, just like turning to a new page in a bound notebook.

> The first demo account uses the project author's name, rank and regimental number. All other officers, people and incidents in the sample data are **fictional**.
> This is a student project, not an official Royal PNG Constabulary system.

| | |
|---|---|
| Author | Johnson PALINA |
| Student number | `TODO: add student number` |
| Unit | IS323 Mobile App Development, PNG University of Technology |

---

## Features

| Area | What it does |
|---|---|
| Officer accounts | Register with full name, regimental number (unique), rank, station and a 4–6 digit PIN. Log in with regimental number + PIN. |
| Security | PINs are never stored, only a salted PBKDF2 hash plus a device secret (pepper) kept in the OS keystore. 5 wrong PINs means a 5-minute lockout. Auto-lock after 3 minutes of inactivity, and on every app restart. |
| Notebook pages | Title, date and time, location, optional GPS, incident type, people involved, description, action taken, officer, automatic page number and timestamps. |
| Photos | Camera or gallery, up to 10 per page, thumbnails, full-screen viewer, removable while the page is a draft. |
| Drafts | "Save draft" keeps the page editable. Only drafts can be deleted, after a confirmation. |
| Save & lock | "Save & close page" validates the whole page, locks it, gives it the next page number, and clears the form. |
| Amendments | Saved pages cannot be edited or deleted. Corrections are added as timestamped amendments, and the original text is kept. |
| Browse | Notebook list (newest first) with page number, title, type, date and photo count. Keyword search, plus filters by type, status and date range. |
| Dashboard | Today's entries, saved pages, drafts in progress, incidents by type, recent pages. |
| Export | Share a saved page as a PDF (with photos and amendments) through the phone's share sheet. |
| Offline | Everything works with no network after installation. |

---

## Tech stack

| Package | Purpose |
|---|---|
| Expo SDK 58, React Native 0.88, React 19 | App framework (JavaScript and TypeScript) |
| TypeScript | Type checking for the data layer, services and components |
| expo-router | File-based navigation with protected routes |
| expo-sqlite | Local SQLite database |
| expo-file-system | Copies photos into private app storage |
| expo-image-picker | Camera and gallery |
| expo-location | Optional GPS |
| expo-print + expo-sharing | PDF export and share sheet |
| expo-secure-store | Session and PIN pepper in the Android Keystore / iOS Keychain |
| expo-crypto | Secure random salts and UUIDs |
| @noble/hashes | PBKDF2-SHA256 (pure JS, audited; expo-crypto has no key-derivation function) |

All of these are included in **Expo Go**, so no custom native build is needed for testing.

---

## Installation

**Requirements**
- Node.js 22.18 or newer (developed with Node 24). The tests load `.ts` files directly, which needs Node's built-in type stripping. Check with `node -v`.
- A phone with **Expo Go** from the Play Store or App Store. The Expo Go version must support **SDK 58**.
- Phone and computer on the **same Wi-Fi** network. A phone hotspot works if campus Wi-Fi blocks devices from seeing each other.

```bash
cd CopNote
npm install
```

## Launching

```bash
npx expo start
```

A QR code appears in the terminal.

- **Android:** open Expo Go and tap *Scan QR code*.
- **iPhone:** scan the QR code with the Camera app, then open it in Expo Go.

If the phone cannot connect (common on university networks), use a tunnel:

```bash
npx expo start --tunnel
```

After changing `app.json`, or if you see strange caching errors, run `npx expo start --clear`.

**Android emulator:** with Android Studio and an emulator running, press `a` in the Expo terminal.

**Windows browser:** press `w` in the Expo terminal, or run `npm run web`. Use Edge or Chrome. Differences from the phone app:

- Data is saved in that browser only, separately from any phone. Clearing the browser's site data deletes it.
- Refreshing the page asks you to log in again, because the browser has no secure storage for the session or the PIN pepper.
- Photos come from "Choose photos" (no camera), and are stored inside the database.
- "Print or save as PDF" opens the browser's print dialog.

The web version is for demonstrating and reviewing the app. The phone app has the stronger PIN protection.

## Demo accounts

The database is created and seeded the first time the app opens.

| Regimental no. | PIN | Officer |
|---|---|---|
| `16237` | `2580` | Constable Johnson PALINA, Provincial Police Headquarter - Morobe (PPHQ - Morobe) (3 saved pages, 1 draft, 1 amendment) |
| `RPNGC-7731` | `1357` | Sergeant Grace Waim, Lae Top Town Police Station (1 saved page) |

<img src="assets/johnson-palina.jpg" alt="Constable Johnson PALINA" width="120">

The picture above ships with the app and appears on the dashboard for account `16237` on any device. Tap it in the app to replace it on that device.

To reset the demo data, clear Expo Go's app data. On Android, long-press Expo Go, then *App info → Storage → Clear data*. On iPhone, delete and reinstall Expo Go. Note that this also removes data for any other projects opened in Expo Go.

---

## Environment variables

None are required yet: the app makes no network calls. `.env.example` lists
the variable names reserved for a future backend. To use them, copy it to
`.env` (which Git ignores) and fill in real values.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Reserved: backend project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Reserved: publishable (anonymous) key. Never a service-role key |

`EXPO_PUBLIC_` values are built into the APK and readable by anyone who has
it. Cloud builds do not read your local `.env`: add each variable to the
build profile in `eas.json` or with `eas env:create`.

## External APIs and services

| Service | Used for | Network? |
|---|---|---|
| expo-location (device GPS) | Optional coordinates on a notebook page | No |
| expo-image-picker (camera and gallery) | Incident photos | No |
| expo-print + expo-sharing | PDF export through the share sheet | No |
| expo-secure-store | Session and PIN pepper in the OS keystore | No |
| Expo Application Services (EAS Build) | Compiling the signed APK and AAB | Build time only |

## Building the APK and AAB (EAS Build)

Commit all work first. Profiles are defined in `eas.json`:

| Profile | Produces | Purpose |
|---|---|---|
| `development` | APK with dev client | Optional, replaces Expo Go |
| `preview` | APK | Installable build for testing and marking |
| `production` | AAB | Google Play bundle (version code auto-increments) |

```bash
npm install -g eas-cli
eas login
eas init                                         # links the project, adds extra.eas.projectId to app.json
eas build --platform android --profile preview     # APK
eas build --platform android --profile production  # AAB
eas build:list                                   # build IDs and status
```

EAS creates and stores the Android upload keystore on the first build.
Back it up with `eas credentials`, and never commit it.

## Screenshots

`TODO: add screenshots from the installed APK to docs/screenshots/ and list them here`
(login, dashboard, notebook list, page editor, page detail, PDF export).

---

## Checks

```bash
npm test          # 25 unit and database tests (Node's built-in test runner and SQLite)
npm run typecheck # TypeScript (tsc --noEmit)
npm run lint      # ESLint with eslint-config-expo
npm run format:check # Prettier (npm run format to fix)
npx expo-doctor   # dependency and config checks
npx expo export --platform android   # proves the whole app bundles
```

The database tests run the **real** schema SQL and repository functions
against Node's built-in SQLite. They verify the page numbering, the integrity
triggers, the ownership rules, the cascades, and search and filtering.

## Testing on a device: checklist

These need a real phone (or emulator) and cannot be covered by automated tests:

1. **Register** a new officer. Try a duplicate regimental number and mismatched PINs, and check the error messages.
2. **Login** with a wrong PIN 5 times and confirm the 5-minute lockout.
3. **Camera:** take a photo, check the thumbnail and full-screen viewer, then remove it. Deny camera permission once and confirm the app shows a message instead of crashing.
4. **Gallery:** pick several photos.
5. **GPS:** tap *Add GPS* outdoors. Deny permission and confirm manual location entry still works. Try with Location switched off.
6. **Draft:** save a draft, close the app completely, reopen it, unlock, and continue editing.
7. **Save & close:** confirm the page becomes Page N, is read-only, and the form is blank.
8. **Amendment:** add one to a saved page and check that the original text is unchanged.
9. **PDF:** share a saved page with photos, and open the PDF to check the images appear.
10. **Inactivity lock:** leave the app for 3 minutes, or press *Lock now*. Confirm the half-written page is still there after unlocking.
11. **Offline:** turn on Airplane mode, restart the app, and repeat steps 3, 6 and 7.
12. **Login speed:** note how long login takes. The PIN hash uses 4,000 PBKDF2 iterations in pure JavaScript (see `src/utils/constants.ts`).

---

## Project structure

```
src/
  app/                 Expo Router routes (thin files that render a screen)
    _layout.js         Providers, protected routes, inactivity capture, lock overlay
    login.js, register.js
    (tabs)/            Dashboard (index), Notebook, New page
    page/[id].js       Page detail
    edit/[id].js       Continue editing a draft
  screens/             Screen components (UI and screen logic)                     [.js]
  components/          Reusable UI: AppButton, TextField, PageCard, theme, ...      [.tsx, .ts]
  database/            One repository per table [.ts]; schema, migrations, seed [.js]
  services/            Auth, session/SecureStore, photos, location, PDF             [.ts, .tsx]
  utils/               Pure functions: validation, dates, query builder, hashing    [.ts]
  types.ts             Shared data types: Officer, Page, Photo, Amendment, rows
tests/                 Node test runner: utils.test.mjs, database.test.mjs
docs/PROJECT_REPORT.md Architecture, schema, features, security, future work
```

### JavaScript and TypeScript

The project mixes both languages on purpose (`allowJs` in `tsconfig.json`):

- **TypeScript** (`.ts`, `.tsx`) where a mistake would spread: the shared data
  types, database repositories, services, utilities and reusable components.
  `npm run typecheck` checks these.
- **JavaScript** (`.js`) where types add little: thin route files, screens,
  the schema SQL text and seed data, config files, and the tests.

Files that the Node tests import use the full `.ts` extension in their own
imports (for example `'./dates.ts'`), because Node needs the real file name.
Other files import without an extension, as usual in Expo.

## Security limitations (summary)

This is **local, on-device** authentication for a student project. See
[docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md#6-security-design-and-limitations)
for the full discussion.

- Data lives on **one phone only**. There is no backup, central records system, or supervisor access.
- The app cannot confirm that a registered person is a real serving officer.
- The SQLite file and photos are protected only by the phone's own storage encryption and screen lock. A lost, unlocked or rooted phone is a real risk.
- A real deployment would need a secure backend, official identity, encryption, audit logs, role-based access and sync.

## Known limitations

- **No remote database.** All data is stored on one device in SQLite, so it does not survive reinstalling the app and is not visible from a second phone.
- **No network APIs yet.** GPS coordinates are recorded but not shown on a map or reverse-geocoded.
- **Photos stay on the device.** They are copied into private app storage and are not uploaded anywhere.
- **No PIN reset.** A forgotten PIN means registering again on that device.
- Authentication is local and custom (see above), not handled by an identity provider.

## AI assistance

AI coding assistants were used on this project, as permitted by Section 9 of the project brief.

| Tool | Used for |
|---|---|
| Claude Code (Anthropic) | `TODO: describe, e.g. scaffolding screens, writing tests, reviewing code against the brief, EAS and app.json configuration` |

All generated code was reviewed, run and tested by the author, who can explain it.

## Credits

Built with open-source libraries: Expo and Expo modules, React Native, Expo Router, and @noble/hashes. See `package.json` for the full list.
