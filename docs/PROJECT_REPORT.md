# CopNote — Project Report

*Semester 2 project · React Native and Expo mobile application*

## 1. Introduction

Police officers in Papua New Guinea record incidents in a paper pocket
notebook. Paper pages can be lost, are hard to search, cannot hold photos,
and are difficult to share with the station. **CopNote** is a mobile
"digital pocket notebook". Officers log in, write one page per incident, attach
photos taken on the phone, and save the page. The design copies the rules
of a bound notebook that make it trustworthy as a record:

- pages are numbered in sequence;
- a finished page is never changed or torn out;
- corrections are written as dated amendments, and the original stays readable.

The app works fully **offline**. This matters because mobile data is
unreliable or unavailable in many parts of PNG, and officers often work
outside network coverage.

## 2. Objectives

1. Let officers register and log in securely on a shared or personal phone.
2. Record incidents quickly in the field, with large touch targets and clear error messages.
3. Attach photographic evidence from the camera or gallery.
4. Make saved records tamper-resistant: locked pages and an amendment trail.
5. Let officers find past entries quickly (search and filters) and share them (PDF).
6. Work without internet access.

## 3. Architecture

CopNote uses a layered design. Each layer depends only on the layers below it.

```
┌──────────────────────────────────────────────────────────────┐
│ Routes (src/app)    Expo Router: URLs → screens, auth guards │
├──────────────────────────────────────────────────────────────┤
│ Screens (src/screens)   Login, Register, Lock, Dashboard,    │
│                         Notebook, PageEditor, PageDetail     │
│ Components (src/components)  AppButton, TextField, ChipGroup,│
│                         PhotoGrid, PageCard, StateViews      │
├──────────────────────────────────────────────────────────────┤
│ Services (src/services)  AuthContext (state, inactivity lock)│
│   authService · sessionStore · photoService · locationService│
│   pdfService                                                 │
├──────────────────────────────────────────────────────────────┤
│ Database (src/database)  schema/migrations · seed ·          │
│   officerRepo · pageRepo · photoRepo · amendmentRepo         │
├──────────────────────────────────────────────────────────────┤
│ Utils (src/utils)   PURE functions: validation, dates,       │
│   pageQuery (SQL builder), pageHelpers, hash, constants      │
└──────────────────────────────────────────────────────────────┘
       Device:  SQLite file · private photo folder · OS keystore
```

**Why this structure?**

- **Routes are thin.** Each file in `src/app` only connects a URL to a screen. Screens can therefore be reused: the same `PageEditorScreen` serves both "New page" and "Edit draft".
- **Repositories hold all SQL.** Screens never write SQL, so database rules (such as "only your own pages") live in one place.
- **Utils are pure functions.** They have no React, no database and no device APIs, so they are unit-tested on a laptop with Node's test runner.
- **React Context for authentication.** `AuthProvider` holds the signed-in officer and exposes `login`, `logout`, `unlock` and `lockNow` to every screen through the `useAuth()` hook.

### Navigation

Expo Router builds the navigation from the file structure:

| Route | Screen | Access |
|---|---|---|
| `/login`, `/register` | Login, Registration | Only when signed **out** |
| `/` (tab) | Dashboard | Signed in |
| `/notebook` (tab) | Notebook list | Signed in |
| `/new` (tab) | Page editor (blank) | Signed in |
| `/page/[id]` | Page detail | Signed in |
| `/edit/[id]` | Page editor (draft) | Signed in |

`Stack.Protected` guards switch between the two groups automatically. When
`login()` succeeds, the login screens disappear and the router moves to the
dashboard. When `logout()` runs, the reverse happens. The **lock screen** is an
overlay drawn above the navigator rather than a route. This means a
half-written page is still there after the officer unlocks.

## 4. Database design

SQLite through `expo-sqlite`. There are four tables, with foreign keys
enabled (`PRAGMA foreign_keys = ON`).

```
officers 1 ───< pages 1 ───< photos
    1               1
    └──────< amendments >───┘
```

### officers
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| full_name, rank, station | TEXT | |
| regimental_number | TEXT **UNIQUE** | Normalised to upper case |
| pin_hash, pin_salt, pin_iterations | TEXT/INT | PBKDF2 output, random salt, work factor. **No PIN is stored.** |
| failed_attempts, lockout_until | INT/TEXT | Brute-force protection |
| created_at | TEXT | |

### pages
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| officer_id | FK → officers | Owner. Every query filters by it. |
| page_number | INTEGER | NULL while a draft; assigned on save; `UNIQUE(officer_id, page_number)` |
| title, location, incident_type, people_involved, description, action_taken | TEXT | |
| incident_date / incident_time | TEXT | `YYYY-MM-DD` / `HH:MM`, which compare correctly as text |
| latitude, longitude | REAL | Optional GPS |
| status | TEXT | `CHECK (status IN ('draft','saved'))` |
| created_at, updated_at, saved_at | TEXT | Local timestamps |

### photos
`id`, `page_id` (FK → pages, **ON DELETE CASCADE**), `file_uri`, `created_at`.

### amendments
`id`, `page_id` (FK → pages), `officer_id` (FK → officers), `note`, `created_at`.

### Key design decisions

1. **Page numbers are assigned on save, not on creation.** Drafts can be deleted. If drafts took numbers, deleting one would leave a gap (7, 9, 10…) that looks like a page was removed. One `UPDATE` sets `page_number = MAX(page_number) + 1` in the same statement that locks the page, so two saves cannot get the same number.
2. **Locking is enforced by the database itself.** SQLite triggers refuse to `UPDATE` or `DELETE` a saved page, add or remove its photos, or change any amendment. A bug in the app or a hand-written SQL statement cannot tamper with a saved record. The automated tests prove this.
3. **Photos are files, not database blobs.** Images are copied from the camera's temporary cache into `<documents>/photos/<uuid>.jpg`, and only the path is stored. Large blobs would make the database slow and huge. Files are copied **first**, then all database changes run in **one transaction**. If the transaction fails, the copied files are deleted so storage and database stay consistent.
4. **Parameterized queries only.** Every value is bound with `?` placeholders. Search and filters are built by a pure function (`buildPageQuery`) that returns `{ sql, params }`. A test confirms that an input like `'; DROP TABLE pages; --` is treated as plain text.
5. **Migrations with `PRAGMA user_version`** let future versions add columns without losing officers' data.

## 5. Features in detail

**Registration and login.** The form validates the name, the regimental number format (e.g. `10452`, `RPNGC-4821`), rank, station, and a 4–6 digit PIN. It rejects PINs made of one repeated digit, and the confirmation must match. Login uses the regimental number and PIN. The error message is the same whether the number or the PIN is wrong, so the app does not reveal which numbers are registered.

**Inactivity lock.** Every touch (captured at the root view) and every keystroke resets a timer. After 3 minutes of inactivity, or when the app returns from the background after that long, the lock screen asks for the PIN. When the app is restarted it always opens locked.

**Writing a page.** The date and time default to now, with a "Set to now" button. Location is typed, and GPS can optionally be attached. Incident type is chosen from large chips. A draft needs only a title. Saving and locking requires every core field, with clear messages next to each field and a banner at the top.

**Photos.** Camera or gallery (multi-select), up to 10 per page. Thumbnails open a full-screen viewer with previous and next buttons. On drafts each thumbnail has a remove button. If permission is denied, the app shows a message explaining how to enable it in Settings.

**Amendments.** Saved pages show an "Add amendment" form. Each amendment is stamped with the date, time and officer, and listed under the original entry.

**Notebook.** A FlatList (efficient for long lists) of page cards. Search covers the title, location, description, people involved and action taken, or an exact page number. Filters are incident type, status and a date range. Separate empty states distinguish "no pages yet" from "no matches".

**Dashboard.** Today's entries, saved pages and drafts, plus a bar chart of incidents by type. All of it is computed with `reduce` in `summarisePages()`.

**PDF export.** `expo-print` renders an HTML version of the page, including amendments and photos (embedded as base64 so they also print on iOS). `expo-sharing` opens the share sheet for WhatsApp, email, Drive or a printer.

## 6. Security design and limitations

### What the app does
- **PIN hashing:** PBKDF2-HMAC-SHA256 with a random 16-byte salt per officer and 4,000 iterations, using the audited `@noble/hashes` library. Hashes are compared in constant time.
- **Pepper:** a random 32-byte secret stored in the **Android Keystore / iOS Keychain** through `expo-secure-store`, and mixed into every hash. A 4–6 digit PIN has only 1,000,000 combinations, so a copied database could otherwise be brute-forced. Without the keystore secret, the copied hashes are useless.
- **Lockout:** 5 wrong PINs locks the account for 5 minutes.
- **Session:** only the officer's id is kept in SecureStore, and the PIN is always asked for again after a restart.
- **Ownership:** every query is limited to the signed-in officer's id.
- **Record integrity:** saved pages are locked by database triggers.

### Limitations (honest assessment)
1. **Single device.** All data lives on one phone. If the phone is lost, stolen, broken or reset, the notebook is gone. There is no backup.
2. **No real identity check.** Anyone can register any name and regimental number. The app cannot confirm that a person is a serving officer.
3. **Storage encryption depends on the phone.** The SQLite file and photos are not encrypted by CopNote itself. They rely on the phone's full-disk encryption and screen lock. A rooted phone, or one with no screen lock, exposes them.
4. **The pepper is tied to the device keystore.** If the keystore is cleared but app data is restored (for example by some backup tools), existing PINs will no longer verify.
5. **The PIN space is small.** Lockout and the pepper reduce the risk but do not remove it.
6. **Device clock.** Timestamps come from the phone's clock, which the user can change.
7. **No supervisor view and no chain of custody.** The PDF is a convenience copy, not a certified document.

### What a real police deployment would need
- A **secure backend server** that stores records centrally, with **encrypted sync** (TLS) and offline queueing so field work continues without coverage.
- **Official identity:** accounts issued by the RPNGC from personnel records, with strong passwords or SSO plus a device PIN or biometrics, and remote account disable.
- **Encryption at rest** on the device (e.g. SQLCipher) and on the server, with keys managed by a key-management service.
- **Role-based access control:** officers, supervisors, investigators and prosecutors see different things. Supervisors review and countersign pages.
- **Tamper-evident audit logs:** every view, export and amendment logged on the server. Pages could be hash-chained, and server-signed timestamps would replace the phone's clock.
- **Device management (MDM):** remote wipe of lost phones, enforced screen lock, and blocked screenshots of sensitive screens.
- **Evidence handling:** photo hashes recorded on capture, chain-of-custody records, retention and disposal rules, and compliance with PNG law and police standing orders.
- Security testing and a privacy impact assessment before use.

## 7. Testing

| Check | Result |
|---|---|
| `npm test`: 18 automated tests | All pass |
| `npm run lint` (ESLint, eslint-config-expo, React Compiler rules) | No problems |
| `npx expo-doctor` | 20/20 checks pass |
| `npx expo export` for Android and iOS | Both bundles compile (Hermes bytecode) |

The tests cover:
- **Pure functions:** validation (dates, times, regimental numbers, PINs, pages), the SQL builder (placeholders and injection text), `reduce` summaries, immutability, HTML escaping, PIN hashing with salt and pepper.
- **Database:** the real schema SQL run in Node's built-in SQLite. Unique regimental numbers; draft, edit and lock with sequential numbering; triggers blocking updates, deletes and photo changes on saved pages; amendments allowed only on saved pages and append-only; one officer cannot read or change another's pages; cascade delete of draft photos; search, filters, date range and photo counts.

Camera, gallery, GPS, SecureStore, PDF sharing, the inactivity lock and login speed must be tested on a real phone. The README contains a device-testing checklist.

## 8. JavaScript and React concepts used

| Concept | Where |
|---|---|
| Modules (import/export) | Every file. Routes re-export screens. |
| Destructuring | `const { title, incidentType } = page` in `PageCard`, function parameters in validators |
| Spread / immutable updates | `setForm(prev => ({ ...prev, [field]: value }))`, `removeAt()` |
| map / filter / reduce | `rows.map(rowToPage)`, `photos.filter(p => p.isNew)`, `summarisePages()` |
| async/await, Promise.all | Every repository and service, and loading photos and amendments together |
| Closures | `setField('title')` returns a function bound to one field |
| Pure functions | `src/utils/*`, all unit-tested |
| Components and props | `AppButton`, `TextField`, `PageCard`, … |
| State and effects | `useState`, `useEffect` (debounced search, inactivity timer), `useFocusEffect` (refresh on tab focus) |
| Refs | `useRef` for the last-activity time and the scroll view |
| Context and custom hooks | `AuthProvider` / `useAuth()` |
| Controlled forms | All inputs: value from state, `onChangeText` updates state |

## 9. Future improvements

1. **Central server and sync:** upload locked pages to a station server when a network is available, with a queue for offline work.
2. **Supervisor role:** review and countersign pages, plus station-level dashboards.
3. **Encrypted database** with SQLCipher, and encrypted photo files.
4. **Biometric unlock** (fingerprint or face) with `expo-local-authentication`.
5. **Photo integrity:** store a SHA-256 hash of each photo when it is taken, and show it in the PDF.
6. **Voice notes** and speech-to-text for faster narrative entry. Tok Pisin and Hiri Motu interface translations.
7. **Native date and time pickers** in place of typed `YYYY-MM-DD` / `HH:MM`.
8. **Offline maps** showing where incidents happened, plus offline reverse geocoding for PNG place names.
9. **Draft auto-save** every few seconds, and a warning when leaving a page with unsaved changes.
10. **Structured people records** (role, name, contact, ID) instead of free text, linked across pages.
11. **Occurrence book reference** and case-file numbers linking a page to station records.
12. **Backup and restore** to an encrypted file, and the ability to move to a new phone.
13. **Signature capture** for complainants and witnesses.
14. **Shift reports:** a one-tap PDF of all pages from a shift.
