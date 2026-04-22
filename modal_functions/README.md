# modal_functions

Serverless backends that the frontend calls over HTTPS. Each file is an independent [Modal](https://modal.com/) app — deploy and update them separately.

## Files

- **`skolegpt_stream.py`** — FastAPI endpoint that proxies OpenAI-format chat messages to the SkoleGPT (Danish LLM) API and streams the response back as SSE. Consumed by `src/utils/aiStream.js` via `VITE_MODAL_ENDPOINT_URL`.
- **`esp32_compile.py`** — FastAPI endpoint that compiles an Arduino sketch with `arduino-cli` and returns the merged flash image as base64. Consumed by `src/utils/esp32/esp32Compile.js` via `VITE_ESP32_COMPILE_URL`.
- **`requirements-modal.txt`** — just the `modal` CLI/SDK version used for deploying; runtime dependencies live inside each file's `modal.Image` definition.

## Setup

```bash
pip install -r modal_functions/requirements-modal.txt
modal setup   # one-time auth
```

The SkoleGPT function reads its upstream URL and API key from a Modal secret named `skolegpt-credentials` (`SKOLEGPT_API_URL`, `SKOLEGPT_API_KEY`). Create it once:

```bash
modal secret create skolegpt-credentials SKOLEGPT_API_URL=... SKOLEGPT_API_KEY=...
```

The ESP32 compile function needs no secrets.

## Deploy

```bash
modal deploy modal_functions/skolegpt_stream.py
modal deploy modal_functions/esp32_compile.py
```

Each deploy prints the web URL for its `@modal.fastapi_endpoint` — paste those into the frontend `.env` as `VITE_MODAL_ENDPOINT_URL` and `VITE_ESP32_COMPILE_URL`.

Quick iteration without deploying: `modal serve modal_functions/<file>.py` gives a temporary URL that updates on save.

## Scaling notes

### `skolegpt_stream.py`

Per-request work is I/O-bound (waiting on the upstream LLM), so a single container happily multiplexes many streams — hence `max_inputs=100, target_inputs=80`. Modal autoscales containers beyond that.

### `esp32_compile.py`

`arduino-cli compile` is CPU-bound, so the tuning is the opposite: one compile per container, fan out horizontally. Current config:

- `cpu=2.0` — two cores per compile for speed.
- `min_containers=1` — keeps one warm container live so the first compile of the day skips the ~20s cold start (the image bundles the full ESP32 toolchain + libraries, which is heavy).
- `scaledown_window=600` — bursts stay warm for 10 min, so a class of students compiling every few minutes stays on hot capacity.
- `max_inputs=2, target_inputs=1` — Modal fans out to a new container as soon as a second request lands, instead of packing compiles onto one CPU.

If you're not running a class, dropping `min_containers` to `0` removes the idle cost at the price of one cold start per idle period.

Allowed boards are pinned in `ALLOWED_FQBNS`; adding a new FQBN requires only adding it to that set (the ESP32 core is already installed). Adding a new Arduino **library** requires editing the `arduino-cli lib install` line in the image and redeploying.

## Gotchas

- The endpoints set permissive CORS (`Access-Control-Allow-Origin: *`) because the frontend is served from a different origin (Vercel) than Modal. Keep that in mind if you ever want to lock it down.
- `modal deploy` replaces the prior version of the app with the same name (`coderobots-esp32-compile`, `coderobots-skolegpt-stream`). There is no staging slot — deploy from a branch you've tested with `modal serve` first.
- The ESP32 image rebuilds from scratch whenever you change `run_commands`; expect a multi-minute first deploy after editing the toolchain setup.


TODO: automatic reboot after flash and disconnect on unplug or somehow keep-open after compile so that we don't get an error on the second compile after disconnect/connect