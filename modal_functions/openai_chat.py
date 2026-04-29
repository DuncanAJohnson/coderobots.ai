"""Modal endpoint for the OpenAI-backed chat variant.

Single-call alternative to the SkoleGPT tutor pipeline: builds one flat system
prompt (hardware preamble + level guidance + all default doc bundles + code
examples + language nudge), sends it straight to OpenAI Chat Completions, and
streams back via the same SSE envelope that aiStream.js already consumes.

Streams gpt-5-nano. gpt-5-mini and gpt-5 are non-streaming — the full response
is collected, then emitted as a single content event followed by done.
"""

import json
import logging
import os
import pathlib

import modal

_LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logging.getLogger().setLevel(logging.INFO)
logging.getLogger("openai_chat").setLevel(_LOG_LEVEL)
logging.getLogger("prompts").setLevel(_LOG_LEVEL)
for _noisy in ("hpack", "h2", "asyncio", "urllib3", "aiohttp", "modal", "grpclib", "grpc", "httpx", "httpcore", "openai"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
logger = logging.getLogger("openai_chat")

app = modal.App("coderobots-openai-chat")

ROOT = pathlib.Path(__file__).parent
image = (
    modal.Image.debian_slim()
    .pip_install("fastapi", "openai>=1.55.0")
    .add_local_dir(str(ROOT / "prompts"), remote_path="/root/prompts")
)

ALLOWED_MODELS = {"gpt-5-nano", "gpt-5-mini", "gpt-5"}
STREAMING_MODELS = {"gpt-5-nano"}
DEFAULT_MODEL = "gpt-5-nano"

LANG_INSTRUCTION = {
    "da": "Skriv ALLE svar paa dansk. Skriv kommentarer i koden paa dansk.",
    "en": "Write ALL replies in English. Write code comments in English.",
}


def _build_system_prompt(hw_mode: str, level: str, lang: str) -> str:
    """Flatten preamble + level + all default docs + examples + language nudge."""
    from prompts import BUNDLES, DEFAULT_BUNDLES, EXAMPLES, LEVEL_PROMPTS, PREAMBLES

    preamble = PREAMBLES.get(hw_mode, "")
    level_text = LEVEL_PROMPTS.get(level, "")
    bundles = BUNDLES.get(hw_mode, {})
    defaults = [n for n in DEFAULT_BUNDLES.get(hw_mode, []) if n in bundles]
    docs = "\n\n".join(bundles[n] for n in defaults)
    examples = EXAMPLES.get(hw_mode, "")
    lang_instruction = LANG_INSTRUCTION.get(lang, LANG_INSTRUCTION["da"])

    parts = [
        lang_instruction,
        f"Hardware: {hw_mode}. Student level: {level}.",
        level_text,
        preamble,
        f"Relevant documentation:\n{docs}" if docs else "",
        examples,
    ]
    return "\n\n".join(p for p in parts if p)


def _build_user_message(user_msg: str, hw_mode: str, code: str | None, console: str | None) -> str:
    """Mirror ChatPanel/tutor_pipeline wrapping: code + console fences before user msg."""
    code_lang = "cpp" if hw_mode == "esp32" else "python"
    parts: list[str] = []
    if code:
        parts.append(f"```{code_lang}\n{code}\n```")
    if console:
        parts.append(f"````\n{console}\n````")
    parts.append(user_msg)
    return "\n\n".join(parts)


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("gist-openai-key")],
    timeout=300,
)
@modal.concurrent(max_inputs=100, target_inputs=80)
async def stream_openai_chat(
    history: list[dict],
    user_msg: str,
    hw_mode: str,
    level: str,
    model: str,
    code: str | None = None,
    console: str | None = None,
    lang: str = "da",
):
    """Yield SSE-framed events for a single OpenAI chat call.

    Streams content for gpt-5-nano; collects-then-emits for gpt-5-mini / gpt-5.
    """
    from openai import AsyncOpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set")
        yield _sse({"type": "error", "error": "OPENAI_API_KEY not configured"})
        return

    if model not in ALLOWED_MODELS:
        logger.warning("rejecting unknown model=%r; falling back to %s", model, DEFAULT_MODEL)
        model = DEFAULT_MODEL

    system_prompt = _build_system_prompt(hw_mode, level, lang)
    user_content = _build_user_message(user_msg, hw_mode, code, console)
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": user_content},
    ]

    logger.info(
        "openai chat: model=%s hw=%s level=%s lang=%s history=%d msgs system=%d chars user=%d chars",
        model, hw_mode, level, lang, len(history), len(system_prompt), len(user_content),
    )

    client = AsyncOpenAI(api_key=api_key)
    should_stream = model in STREAMING_MODELS

    try:
        if should_stream:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                token = getattr(delta, "content", None)
                if token:
                    yield _sse({"type": "content", "content": token})
        else:
            completion = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=False,
            )
            text = completion.choices[0].message.content or ""
            yield _sse({"type": "content", "content": text})

        yield _sse({"type": "done"})
    except Exception as e:
        logger.exception("openai chat failed")
        yield _sse({"type": "error", "error": str(e)})


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("gist-openai-key")],
)
@modal.concurrent(max_inputs=100, target_inputs=80)
@modal.fastapi_endpoint(method="POST")
async def openai_endpoint(request: dict):
    """HTTP endpoint for OpenAI chat requests.

    Expected payload:
    {
        "history": [{"role": "user|assistant", "content": "..."}],
        "user_msg": "...",
        "hw_mode": "spike" | "microbit" | "lego" | "esp32",
        "level": "beginner" | "intermediate" | "experienced",
        "model": "gpt-5-nano" | "gpt-5-mini" | "gpt-5",
        "code": "...",      // optional
        "console": "...",   // optional
        "lang": "da" | "en" // optional, default "da"
    }
    """
    from fastapi.responses import StreamingResponse

    if not request.get("user_msg") or not request.get("hw_mode"):
        return {"error": "user_msg and hw_mode are required"}, 400

    return StreamingResponse(
        stream_openai_chat.remote_gen(
            history=request.get("history", []),
            user_msg=request["user_msg"],
            hw_mode=request["hw_mode"],
            level=request.get("level", "intermediate"),
            model=request.get("model", DEFAULT_MODEL),
            code=request.get("code"),
            console=request.get("console"),
            lang=request.get("lang", "da"),
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )
