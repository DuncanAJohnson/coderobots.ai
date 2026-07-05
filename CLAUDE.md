# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

There may be other agents working in this file, do not make changes or fixes to files that you are not working on. There may be linter errors unrelated to your work, but do not fix those.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint + locale dictionary checks
npm run check:locales    # Locale key parity / dangling t() references only
npm run preview    # Preview production build
npm run generate:schema  # Regenerate Zod schemas from database
```

There are no automated tests in this project.

## Instance Configuration

One codebase serves multiple deployments ("instances"). Each instance is a
file in `src/config/instances/<id>.js`, selected at build time via the
`VITE_INSTANCE` env var (default `purdue`) through `src/config/instance.js`.
An instance config declares:

- `brand` — name/logo/colors applied by `src/config/applyBrand.js`
- `telemetry` — `true`: Supabase persistence + required email/password auth;
  `false`: localStorage persistence, fully anonymous, no budget UI
- `platforms` — allowlist of platform ids offered for new sessions
- `chat.mode` — `'direct'` (client-side priming, model picker,
  budget-enforced endpoint) or `'tutor'` (server-side prompt pipeline)
- `chat.showBudgetUI` — usage ring + budget reads in the chat panel
- `locales` — `{ available, default }` for the i18n system
- `routes.admin` — enables `/data`, `/usage`, `/view-data`

Reference instances: `purdue.js` (research tool: telemetry, direct chat, all
serial platforms, English) and `skolegpt-dk.js` (Danish: anonymous, tutor
chat, lego/microbit/esp32, da default).

## Environment Variables

Copy `.env.example` to `.env.local`. Which vars are required depends on the
instance: telemetry instances need `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
and `VITE_MODAL_BUDGET_ENDPOINT_URL` (direct chat); tutor instances need
`VITE_MODAL_TUTOR_ENDPOINT_URL`. `VITE_INSTANCE` picks the instance config.

## Architecture

This is a React + Vite SPA (no backend server — all server logic runs on Modal serverless functions and, for telemetry instances, Supabase).

### Application Layout

The app renders a split-pane layout:
- **Left panel** — `SPIKEEditor`: Python code editor (CodeMirror) + xterm.js terminal for the connected device
- **Right panel** — `ChatPanel`: AI chat assistant

Both panels are wrapped in `AuthProvider` and `SessionProvider` context providers (see `src/contexts/`), with `LanguageProvider` outermost in `main.jsx`.

### Routing

Routes in `App.jsx` (admin routes only when `instance.routes.admin`):
- `/` — Main editor + chat UI (`AppContent`)
- `/data` — `DataExtractor` admin tool for exporting session data
- `/usage` — `AdminUsageDashboard` for monitoring AI usage
- `/view-data` — `ReplayView` session replay viewer

### Localization

Hand-rolled i18n: `src/contexts/LanguageContext.jsx` provides
`useLanguage()` → `{ lang, switchLang, t }`. `t(key)` does a flat lookup in
`src/locales/<lang>.json` with English fallback; the choice persists in
localStorage and is clamped to `instance.locales.available`. Components use
`t('camelCaseKey')` for every user-visible string; new keys must be added to
BOTH `en.json` and `da.json` (`npm run check:locales` enforces parity and
catches dangling references — it runs as part of `npm run lint`). Admin tools
(`data_extractor/`, `admin_usage/`, `replay/`) and the LilyBot-only
`HardwareConfigModal` are intentionally English-only. In direct chat mode a
respond-in-Danish system directive is appended when the UI language is Danish;
in tutor mode `lang` is part of the payload.

### Session & Data Model

Sessions are the top-level unit. Each session has:
- A **hardware_platform** chosen at creation — determines connection type, stop code, and AI priming
- Multiple **conversations** (chat tabs) — one is "current"
- Multiple **code records** (code tabs) — one is "current"
- **Code snapshots** logged automatically at key events (`run_device`, `manual_save`, `ai_replace`, `chat_context`)
- **Console logs** and **interactions** (button clicks) also persisted

All database schemas are defined as Zod schemas in `src/services/dbSchemas.js`. Supabase table names are in the `TABLES` constant there. Always validate inserts through these schemas.

`SessionContext` (`src/contexts/SessionContext.jsx`) manages all session state and exposes functions for switching sessions/conversations/code tabs, creating new ones (`createSessionWithPlatform`), back-filling platform on legacy rows (`assignPlatformToSession`), debounced live code saving (1s), and snapshot creation. Legacy sessions without `hardware_platform` are surfaced via `pendingPlatformSession` so the UI can force a platform pick before activating.

### Persistence Adapters

The service modules `sessionManager.js`, `dataLogger.js`, `aiUsage.js`,
`userProfile.js`, and `hardwareConfig.js` are thin facades delegating to the
adapter selected in `src/services/persistence/index.js`:

- `supabaseAdapter/` — the original cloud implementation (telemetry on)
- `localAdapter/` — localStorage-backed store (`coderobots_local_db_v1`) with
  auto-increment integer ids, in-memory cache, per-table history caps, and
  quota-exceeded trimming (telemetry off)

The adapter interface IS the original function signatures/row shapes — keep
both implementations in sync (interface documented in `persistence/index.js`).
`adminUsage.js` and `dataExport.js` bypass the seam (admin-only routes).
`src/services/supabase.js` never throws at import: without env vars it exports
a proxy that throws a descriptive error on first use (plus
`isSupabaseConfigured` / `requireSupabase()`).

Auth follows telemetry: `AuthContext.jsx` renders `SupabaseAuthProvider`
(email/password) or `AnonymousAuthProvider` (static local user, no login).

### Platform Abstraction

Hardware platforms are registered in `src/platforms/index.js` and each lives in its own folder (`src/platforms/<id>/`) exposing `{ id, label, connectionType, buildPriming(hardwareConfig), stopCode, postConnectFiles?, tutorHwMode? }`:
- `lilybot` → connectionType `pico`, dynamic priming built from the user's `hardwarePromptConfig`
- `microbit` → connectionType `microbit`, static priming
- `cutebot` → connectionType `microbit`, uses `postConnectFiles`
- `esp32` → connectionType `esp32`, uses `postConnectFiles`
- `lego` → connectionType `lego-ble` (Web Bluetooth + Pyodide, no serial; `stopCode: null`)

`tutorHwMode` (microbit/esp32/lego) marks tutor-pipeline support; platforms without it are unsupported in `chat.mode: 'tutor'`. Instances gate the offered subset via `instance.platforms` (`getPlatform()` stays unfiltered so legacy sessions remain readable). When adding a new platform, drop a folder under `src/platforms/`, export the platform object, and register it in `src/platforms/index.js`.

### Hardware Connection (SPIKEEditor)

Serial platforms connect via WebSerial:
- `src/utils/microRepl.js` — `Board` class wrapping `@microbit/microbit-connection` + xterm.js terminal
- Supports **Raspberry Pi Pico W** (`pico`), **micro:bit v2** (`microbit`), and **ESP32** (`esp32`)
- micro:bit flow: first connect attempt detects missing MicroPython → arms installer → second click flashes bundled `.hex` firmware from `src/assets/firmware/` then connects via serial (`src/utils/microbitInstall.js`)
- On connect, runs the active platform's `stopCode` to halt any running motors

The **LEGO Education** platform (`lego-ble`) is different: devices pair over
Web Bluetooth (`public/lego-education-ble.js`) and student Python runs in a
Pyodide web worker (`public/pyodideWorker.js` loading
`public/legoeducation.py`), bridged by synchronous SharedArrayBuffer+Atomics
RPC (`src/utils/legoEducation/`). This REQUIRES cross-origin isolation —
COOP/COEP headers are set in `vite.config.js` (dev/preview) and `vercel.json`
(prod); removing them breaks LEGO mode. The Pyodide worker boots lazily on
first LEGO connect. Run dispatches to `pyodideRunner.runPython`; stop is
`interruptPython()` + `stopAllMotion()`.

### Per-User Hardware Configuration (LilyBot)

LilyBot priming is parameterized by the user's wiring. Pure helpers live in `src/services/hardwareParts.js`; Supabase fetching goes through the persistence adapter:
- Available MPUs and components from Supabase `app_config` (keys: `LILYBOT_MPUS`, `LILYBOT_COMPONENTS`, `LILYBOT_HARDWARE_TEMPLATES`)
- Part metadata from `src/assets/fritzing/catalog.js` with Fritzing `.fzpz` files under `src/assets/fritzing/<folder>/`
- The user's selected MPU + pin-to-component mappings from auth user metadata (`lilybot_hardware_config`)

`toPromptHardwareConfig(...)` converts this into the structure consumed by `buildLilyBotPriming`. `HardwareConfigModal` is the UI for editing this; `MpuPinDiagram` / `ComponentPinDiagram` render the pinouts via parsed Fritzing data (`src/utils/fritzing.js`, `src/utils/pinDiagram.js`).

### AI Chat — Two Modes

`ChatPanel` streams SSE from Modal endpoints via `src/utils/chatStream.js`
(shared `readSseEvents` parser; event vocabulary `content | progress |
budget_status | usage_logged | done | error`, documented in
`modal_functions/README.md`). The mode comes from `instance.chat.mode`:

**direct** — the original path. The client assembles `[system priming from
activePlatform.buildPriming(hardwarePromptConfig), coding-level system msg
(src/prompts/codingLevels.js), optional language directive, history, user
turn]` and calls `streamChatCompletionWithBudget` (Supabase auth token +
budget enforcement). Models come at runtime from the Supabase `ai_models`
table via `src/services/aiModels.js` (columns: `model_name`, `provider`,
`streamable`, `unlimited`, `default`).

**tutor** — the client sends raw fields `{history, user_msg, hw_mode, level,
lang, code?, console?}` to the tutor pipeline endpoint
(`streamTutorCompletion`); prompts are assembled SERVER-side. `progress`
events render as a localized collapsible thinking trace. No model picker; no
`ai_models` fetch; assistant messages log `ai_model: 'tutor-pipeline'`.

### Modal Backend (`modal_functions/`)

Deploy with `modal deploy modal_functions/<file>.py` (see `modal_functions/README.md`):
- `chat_with_budget.py` — direct-mode endpoint. Model→provider mapping from the `ai_models` table; providers in `providers/` (`openai`, `anthropic`, `google`, `skolegpt`), gated by `MODAL_PROVIDERS` at deploy; per-user daily budgets via `budget_manager.py` against Supabase.
- `tutor_pipeline.py` — tutor-mode endpoint (`coderobots-tutor` app). 4-stage `pipeline/` chain over the self-hosted SkoleGPT model: SummarizeIfOver → ClassifyDocs (doc-bundle routing) → Outline → FinalAnswer (only streamed stage, localized da/en). Server-side prompt/doc bundles in `modal_functions/prompts/` keyed by hw mode (`spike|microbit|lego|esp32`). Deploy-time env: `TUTOR_MODEL` (model id override), `TUTOR_REQUIRE_AUTH=1` (require Supabase JWT per request). `pipeline/llm.py` and `providers/skolegpt_provider.py` speak the same wire protocol — keep in sync.
- `modal_functions/db_schemas.json` is a JSON mirror of the Zod schemas — regenerate together with the frontend schemas via `npm run generate:schema` when the DB shape changes.

Keep `src/platforms/lego/priming.js` (direct-mode LEGO docs) in sync with `modal_functions/prompts/lego_education.py` (tutor-mode source of truth).

### Key Service Files

- `src/services/supabase.js` — Supabase client (null-safe singleton + `requireSupabase`)
- `src/services/persistence/` — adapter seam (supabaseAdapter / localAdapter)
- `src/services/sessionManager.js` — CRUD facade for sessions, conversations, code records
- `src/services/dataLogger.js` — logging facade for messages, console output, interactions
- `src/services/hardwareConfig.js` — LilyBot wiring facade (+ `hardwareParts.js` pure helpers)
- `src/services/aiUsage.js` — daily budget usage facade (+ `etTime.js` ET day boundaries)
- `src/services/adminUsage.js` — aggregate usage data for admin dashboard (direct Supabase)
- `src/config/instance.js` — instance config selector (`VITE_INSTANCE`)

### Git Archaeology

This repo unified two lineages. The pre-handoff history is grafted onto main
(`--allow-unrelated-histories -s ours` merge), and the old repo's branches
live under `import/*` (skole-gpt, lego-demo) and `archive/*` refs on origin.

### Styling

Plain CSS files co-located with components. Tailwind CSS v4 is also configured (via `@tailwindcss/vite`) but used sparingly.
