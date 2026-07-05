# Modal Deployment Instructions

## Setup

1. Install Modal CLI:
```bash
pip install modal
```

2. Authenticate with Modal:
```bash
modal setup
```

3. Create OpenAI API key secret:
```bash
modal secret create openai-api-key OPENAI_API_KEY=sk-your-api-key-here
```

## Deploy

### OpenAI Streaming Endpoint

```bash
modal deploy modal_functions/openai_stream.py
```

After deployment, Modal will provide a URL for the `chat_endpoint`. 
Copy this URL and add it to your `.env.local` file as `VITE_MODAL_ENDPOINT_URL`.

The URL will look like:
`https://your-workspace--coderobots-openai-stream-chat-endpoint.modal.run`

### OpenAI Streaming with Budget Tracking

```bash
modal deploy modal_functions/openai_stream_with_budget.py
```

After deployment, copy the URL for `chat_endpoint_with_budget` and add it to your `.env.local` file as `VITE_MODAL_BUDGET_ENDPOINT_URL`.

### Deploying with a subset of providers

`modal_functions/chat_with_budget.py` supports four providers: `openai`, `anthropic`, `google`, `skolegpt`. By default it requires the Modal secret for each (`openai-api-key`, `anthropic-secret`, `gemini-secret`, `skolegpt-credentials`), and deployment fails if any are missing.

To deploy with only the providers you have credentials for, set `MODAL_PROVIDERS` (comma-separated) at deploy time:

```bash
# Google only
MODAL_PROVIDERS=google modal deploy modal_functions/chat_with_budget.py

# Google + Anthropic
MODAL_PROVIDERS=google,anthropic modal deploy modal_functions/chat_with_budget.py
```

The `supabase-credentials` secret is always required. Requests for a disabled provider return a clear error; make sure the `ai_models` table in Supabase only lists models whose providers are enabled in the current deployment.

### Tutor Pipeline (chat.mode: 'tutor' instances)

```bash
modal deploy modal_functions/tutor_pipeline.py
```

Copy the `tutor_endpoint` URL into `.env.local` as `VITE_MODAL_TUTOR_ENDPOINT_URL`.

The tutor pipeline is a 4-stage chain over the self-hosted SkoleGPT model
(history summarization → doc-bundle routing → outline → streamed localized
answer) with prompts assembled server-side from `modal_functions/prompts/`.
It requires the `skolegpt-credentials` secret (`SKOLEGPT_API_URL`,
`SKOLEGPT_API_KEY`).

Deploy-time options (set as env vars on the deploy command):

- `TUTOR_MODEL=...` — override the model id sent to the SkoleGPT endpoint
  (default `google/gemma-4-26B-A4B-it`).
- `TUTOR_REQUIRE_AUTH=1` — require a valid Supabase auth token
  (`user_id` + `auth_token` payload fields) on every request; also needs the
  `supabase-credentials` secret. Leave unset for anonymous deployments, and
  restrict CORS/keep the endpoint URL private in that case.

### ESP32 Arduino Compile Service (esp32-arduino platform)

```bash
modal deploy modal_functions/esp32_compile.py
```

Copy the `compile_endpoint` URL into `.env.local` as `VITE_ESP32_COMPILE_URL`.

Compiles Arduino C++ sketches with `arduino-cli` (ESP32 core + Adafruit
SSD1306/GFX/ADXL345 libraries baked into the image) and returns base64
binaries — a merged image (offset 0x0) and the app-only image (offset
0x10000) — which the browser flashes over WebSerial via esptool-js. No
secrets required; caching (result cache + core/library build cache) lives in
the `esp32-build-cache` Modal Volume. This is a plain JSON POST endpoint,
not SSE: `{sketch, board?}` → `{ok, binary, app_binary, ...}`.

## SSE Event Vocabulary

All chat endpoints emit `data: {json}` SSE frames with a `type` field:

| type | emitted by | payload |
|---|---|---|
| `content` | both | `{content}` — answer text delta |
| `progress` | tutor pipeline | `{stage, status, payload?}` — pipeline stage updates |
| `budget_status` / `usage_logged` | chat_with_budget | budget/usage info |
| `done` | both | end of stream |
| `error` | both | `{error}` message |

The frontend reader (`src/utils/chatStream.js` → `readSseEvents`) handles the
union, so either endpoint can gain event types without breaking clients.

## API Notes

This service uses the OpenAI Responses API (not the legacy Chat Completions API).
The service:
- Accepts messages in the old format (array of `{role, content}` objects)
- Converts system messages to `instructions` parameter
- Converts user/assistant messages to the new `input` format
- Streams responses using Server-Sent Events (SSE)
- Maintains compatibility with the existing frontend

