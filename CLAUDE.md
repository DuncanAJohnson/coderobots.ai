# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
npm run generate:schema  # Regenerate Zod schemas from database
```

There are no automated tests in this project.

## Environment Variables

Create `.env.local` with these variables:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_MODAL_BUDGET_ENDPOINT_URL=...   # Modal serverless endpoint with budget tracking
```

## Architecture

This is a React + Vite SPA (no backend — all server logic runs on Modal serverless functions and Supabase).

### Application Layout

The app renders a split-pane layout:
- **Left panel** — `SPIKEEditor`: Python code editor (CodeMirror) + xterm.js terminal for a connected MicroPython device
- **Right panel** — `ChatPanel`: AI chat assistant

Both panels are wrapped in `AuthProvider` and `SessionProvider` context providers (see `src/contexts/`).

### Routing

Three routes in `App.jsx`:
- `/` — Main editor + chat UI (`AppContent`)
- `/data` — `DataExtractor` admin tool for exporting session data
- `/usage` — `AdminUsageDashboard` for monitoring AI usage

### Session & Data Model

Sessions are the top-level unit. Each session has:
- Multiple **conversations** (chat tabs) — one is "current"
- Multiple **code records** (code tabs) — one is "current"
- **Code snapshots** logged automatically at key events (`run_device`, `manual_save`, `ai_replace`, `chat_context`)
- **Console logs** and **interactions** (button clicks) also persisted to Supabase

All database schemas are defined as Zod schemas in `src/services/dbSchemas.js`. Supabase table names are in the `TABLES` constant there. Always validate inserts through these schemas.

`SessionContext` (`src/contexts/SessionContext.jsx`) manages all session state and exposes functions for switching sessions/conversations/code tabs, creating new ones, debounced live code saving (1s), and snapshot creation.

### Hardware Connection (SPIKEEditor)

`SPIKEEditor` connects to MicroPython hardware via WebSerial:
- `src/utils/microRepl.js` — `Board` class wrapping `@microbit/microbit-connection` + xterm.js terminal
- Supports **Raspberry Pi Pico W** ("pico") and **micro:bit v2** ("microbit")
- micro:bit flow: first connect attempt detects missing MicroPython → arms installer → second click flashes bundled `.hex` firmware (`src/assets/firmware/`) then connects via serial
- On connect to Pico, runs `STOP_CODE_LILYBOT` (`src/utils/stopSpike.js`) to halt any running motors

### AI Chat

`ChatPanel` streams responses from a Modal serverless endpoint via SSE. The streaming utility is in `src/utils/chatStream.js`. The primary function used is `streamChatCompletionWithBudget`, which sends the Supabase auth token and user ID to the backend for budget enforcement.

Available AI models are fetched at runtime from the Supabase `ai_models` table (not from env vars) via `src/services/aiModels.js`. The `ai_models` table columns: `model_name`, `provider`, `streamable`, `unlimited`, `default`.

The system prompt (`lilyBotPriming`) in `src/prompts/spike_priming.js` contains the LilyBot hardware documentation injected as the AI's system context. Coding level prompts (beginner/intermediate/experienced) are in `src/prompts/codingLevels.js`.

### Key Service Files

- `src/services/supabase.js` — Supabase client (singleton)
- `src/services/sessionManager.js` — CRUD for sessions, conversations, code records
- `src/services/dataLogger.js` — logging messages, console output, interactions
- `src/services/aiUsage.js` — fetching daily budget usage per user
- `src/services/adminUsage.js` — aggregate usage data for admin dashboard
- `src/config/models.js` — static model-to-provider mapping (legacy, superseded by `ai_models` DB table)

### Styling

Plain CSS files co-located with components. Tailwind CSS v4 is also configured (via `@tailwindcss/vite`) but used sparingly.
