# AL Command — Sprint 1 Setup Guide

Complete instructions to go from a clean clone to a running app on a physical iPhone.
Estimated time: 2–3 hours (mostly Supabase + Apple Dev setup, not writing code).

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 LTS | `brew install node` |
| pnpm or npm | latest | npm is fine |
| Expo CLI | ≥ 12 | `npm i -g expo-cli` |
| EAS CLI | ≥ 12 | `npm i -g eas-cli` |
| Xcode | ≥ 15 | App Store |
| Apple Developer Account | Paid ($99/yr) | developer.apple.com |

---

## Step 1 — Clone & install

```bash
git clone <your-repo-url> al-command
cd al-command
npm install
```

> **Note:** `@react-native-voice/voice` and `expo-apple-authentication` are
> native modules. They will not work in Expo Go. You need the custom dev client
> (built in Step 4). Don't try `npx expo start --go` for Sprint 1.

---

## Step 2 — Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note your **Project URL** and **anon key** (Settings → API).
3. In the SQL editor, paste and run the full contents of:
   `supabase/migrations/0001_sprint1_init.sql`
4. Verify in Table Editor: you should see `users`, `projects`, `tasks`,
   `memory_items`, `activity_logs` tables with RLS enabled.

**Verify RLS (run in SQL editor):**
```sql
-- Should return 0 rows when not authenticated (confirming RLS works)
select count(*) from public.projects;
```

---

## Step 3 — Environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## Step 4 — Apple Developer setup

### 4a. Enable Sign in with Apple

1. developer.apple.com → Certificates, Identifiers & Profiles.
2. Find your App ID `com.alsolutions.alcommand` (or create it).
3. Under **Capabilities**, enable **Sign In with Apple**.
4. Save.

### 4b. EAS project init

```bash
eas login
eas init
```

Copy the `projectId` from the output and paste it into `app.config.ts`:
```typescript
extra: { eas: { projectId: 'paste-your-id-here' } }
```

---

## Step 5 — Build the dev client

The dev client is a custom Expo Go that includes your native modules.
You build it once; then you can iterate without rebuilding until you add
new native packages.

```bash
eas build --profile development --platform ios
```

This takes ~15 minutes on first run. EAS will:
- Prompt you to sign in to your Apple Developer account.
- Create provisioning profiles automatically.
- Build and download the `.ipa`.

Install on device: open the EAS build URL on your iPhone → **Install**.

---

## Step 6 — Start the dev server

```bash
npx expo start --dev-client
```

Open the **Expo Dev Client** app on your iPhone. Scan the QR code or enter the
IP shown in the terminal.

The app should boot, show the login screen, and accept Sign in with Apple.

---

## Step 7 — Verify the basics (acceptance criteria)

Run through these manually after first boot:

**Auth**
- [ ] A1: Apple Sign In completes and lands on Today in ~3s
- [ ] A2: Force-quit and relaunch → session resumes (no sign-in required)
- [ ] A3: Face ID enrolled? Lock screen shows on relaunch
- [ ] A4: 3 Face ID fails → show Retry + Sign out
- [ ] A5: Sign out → Login screen

**Projects**
- [ ] P1: Create a project → appears instantly
- [ ] P2: Name < 1 char → inline error
- [ ] P3: Long-press → archive → removed from list

**Tasks**
- [ ] T1: Create a task under a project
- [ ] T2: Toggle done → survives force-quit
- [ ] T3: Delete → gone from all lists

**Capture**
- [ ] C1: Text capture as Task → appears on Today
- [ ] C2: Text capture as Note → appears under project
- [ ] C3: Voice capture → `source='voice'` tag visible
- [ ] C4: Airplane mode → save works, item visible immediately

**Sync**
- [ ] S1: Item created offline → appears in Supabase after reconnect
- [ ] S2: Toggle offline → reflected after sync
- [ ] S3: Force-quit while offline → item survives; syncs on next launch
- [ ] S4: SyncBadge: Offline → Syncing… → (idle/clean)

---

## Common issues

| Problem | Fix |
|---|---|
| `Voice` module not found | You're in Expo Go. Build the dev client first (Step 5). |
| Apple Sign In fails | Check `usesAppleSignIn: true` in app.config.ts and the Apple Dev entitlement. |
| "Missing Supabase env vars" on launch | `.env` file not created or wrong key names. |
| SecureStore error on token save | Chunking error — check `src/lib/secureStore.ts` CHUNK_SIZE. |
| RLS blocks all queries | Check that you ran the migration SQL and that the user exists in `public.users`. |
| Blank screen after sign in | Check `app/index.tsx` — `initialized` may be stuck `false`. |

---

## Project structure quick reference

```
src/
  lib/          → supabase, secureStore, id, time, logger
  types/        → models.ts (all interfaces)
  theme/        → colors, spacing
  state/        → authStore, syncStore
  services/
    db/         → sqlite, repos (projects, tasks, memory, outbox)
    api/        → supabase CRUD (only used by sync engine)
    sync/       → pushOutbox, pullSnapshot, syncEngine
  features/
    auth/       → useAuth, biometric, AppleSignInButton
    projects/   → useProjects, ProjectCard, ProjectForm
    tasks/      → useTasks, TaskItem, TaskForm
    capture/    → useCapture, usePushToTalk, CaptureInput
  components/   → Button, TextField, ListRow, Empty/Loading/Error, SyncBadge

app/
  _layout.tsx         → Root Stack + auth/sync wiring
  index.tsx           → Route guard
  login.tsx           → Login screen
  capture.tsx         → Modal capture (root level = modal)
  (app)/
    _layout.tsx       → Tabs (Today, Projects) + Face ID gate
    today.tsx         → Today screen
    projects.tsx      → Projects list
    project/[id].tsx  → Project detail
```

---

## Sprint 2 preview (do not build yet)

The next sprint adds: COO agent, morning briefing, GitHub read-only access,
spend cap (`costs` table), and the approval-queue skeleton.

Sprint 1 acceptance gate: **you reach for this app daily for 2 weeks**.
If yes, proceed to Sprint 2. If not, iterate on the core UX first.
