# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server. Sets COEP/COOP headers required for SharedArrayBuffer (LEGO Education mode won't work without them).
- `npm run build` / `npm run preview` — production build to `dist/` / preview the build.
- `npm run lint` — ESLint (flat config in `eslint.config.js`).
- `npm run modal:batch` — load-test the Modal SkoleGPT endpoint via `scripts/modal_batch_calls.mjs`.
- No test suite is configured.

Env var: `VITE_MODAL_ENDPOINT_URL` points the frontend at the deployed Modal function.

## Architecture

This is "EN1 AI Editor" (coderobots.ai) — a Vite + React 19 browser IDE for teaching MicroPython on educational robotics, with a Danish-language AI chat tutor. Two-pane layout wired in `src/App.jsx`: **SPIKEEditor** on the left, **ChatPanel** on the right. `App.jsx` exposes refs so the chat panel can read live code and console output from the editor on demand.

### Hardware modes

`src/contexts/HardwareContext.jsx` tracks the active hardware target and runs registered disconnect handlers when switching. The app supports three mutually-exclusive modes:

1. **micro:bit** — Web Serial REPL through the `Board` class in `src/utils/microRepl.js`. Firmware flashing lives in `src/utils/microbitFirmware.js` (WebUSB via `@microbit/microbit-connection`).
2. **SPIKE Prime** — same `Board` serial REPL. Program slot saves work by pasting a Python snippet that writes the user's code to `/flash/program/{slot}/program.py` and resetting the device.
3. **LEGO Education** — in-browser Pyodide worker (`public/pyodideWorker.js`, loaded via `src/utils/pyodideRunner.js`) plus BLE devices managed in `src/utils/legoDevices.js`. Synchronous device RPC from the worker uses a **SharedArrayBuffer + `Atomics.wait` bridge** in `src/utils/legoBridge.js`: the worker calls `js.LEGO_BRIDGE.rpc(jsonRequest)`, the main thread performs the BLE operation, writes the result back into the SAB, and the worker unblocks. This is what lets tight motor-control loops run in Python without async overhead.

**Switching hardware mode requires full teardown** (`Board.disconnect` → terminate the Pyodide worker → `legoDisconnectAll`). Missing any of these hangs BLE or serial connections until page reload.

### AI chat pipeline

- `src/utils/aiStream.js` — SSE client that yields content/done/error chunks from the Modal endpoint.
- `modal_functions/skolegpt_stream.py` — Modal FastAPI function that proxies OpenAI-format messages to the SkoleGPT (Danish LLM) API and streams responses back as SSE with CORS headers.
- Prompts in `src/prompts/`: hardware-specific priming (`spike_priming.js`, `microbit_priming.js`, `legoEducation_priming.js`) and `codingLevels.js` (beginner / intermediate / experienced tiers). `ChatPanel` builds each request by stacking hardware priming + level instructions + stored history + the new user message, optionally attaching the current code and/or console output as fenced context blocks.
- Chat history is persisted in `localStorage` only — there is no backend store.

### i18n

`src/contexts/LanguageContext.jsx` with `src/locales/{en,da}.json`. Default language is Danish; the LLM priming files also instruct the model to respond in Danish — don't strip that unless you're intentionally internationalizing.

## Gotchas

- **COEP headers are load-bearing.** Both `vite.config.js` and `vercel.json` set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`. They are required for SharedArrayBuffer. Any new deploy target must replicate them or LEGO mode breaks.
- **Pyodide interrupts for LEGO mode** need `freezeBridge()` to pause RPC *before* raising KeyboardInterrupt, otherwise motor-stop calls can be dropped. Motor shutdown is deliberately two-stage (immediate stop + ~150 ms delayed stop) to mitigate GATT write races.
- **Code/console context** is passed to the chat via markdown fences (triple backticks for code, quadruple for console) — preserve that wrapping when touching prompt assembly.

## Key files for orientation

- `src/App.jsx` — top-level split layout, editor↔chat refs
- `src/components/SPIKEEditor.jsx`, `src/components/ChatPanel.jsx`
- `src/contexts/HardwareContext.jsx`
- `src/utils/microRepl.js`, `src/utils/legoBridge.js`, `src/utils/pyodideRunner.js`, `src/utils/aiStream.js`
- `public/pyodideWorker.js`
- `modal_functions/skolegpt_stream.py`
- `src/prompts/*.js`
