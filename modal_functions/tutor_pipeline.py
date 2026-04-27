"""Modal endpoint for the tutor (coding) pipeline.

Four-stage chain over Gemma 3 12B (10k context) tailored to robotics tutoring:

1. SummarizeIfOver  - rolls up long histories so we don't blow the context window.
2. ClassifyDocs     - routes to the relevant doc bundle(s) for the active hardware.
3. Outline          - English pseudocode + problem restatement.
4. FinalAnswer      - streamed Danish response with code + Danish comments.

Stages 1-3 prompt in English (better instruction-following on a small model).
Only the FinalAnswer stage streams content tokens to the client. The existing
aiStream.js client tolerates the in-between {type:"progress"} events.
"""

import logging
import os
import pathlib

import modal

# Modal captures stdout/stderr. Set LOG_LEVEL=DEBUG (in the Modal Secret or env)
# to dump every LLM call's full input messages and full response — verbose but
# invaluable for diagnosing routing / prompt-assembly issues.
#
# IMPORTANT: LOG_LEVEL only affects OUR loggers (tutor_pipeline + pipeline.*).
# The root logger stays at INFO so we don't drown in DEBUG noise from hpack,
# h2, asyncio, aiohttp, modal client, etc. that fire on every gRPC frame.
_LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logging.getLogger().setLevel(logging.INFO)
# Crank up only our own loggers. setLevel on the parent ('pipeline') cascades
# to all child loggers (pipeline.llm, pipeline.pipeline, pipeline.extras, etc.).
logging.getLogger("tutor_pipeline").setLevel(_LOG_LEVEL)
logging.getLogger("pipeline").setLevel(_LOG_LEVEL)
# Belt and suspenders: hard-silence the noisiest third-party DEBUG sources in
# case some library has already configured them propagatively.
for _noisy in ("hpack", "h2", "asyncio", "urllib3", "aiohttp", "modal", "grpclib", "grpc"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)
logger = logging.getLogger("tutor_pipeline")
logger.info("tutor_pipeline module loaded; LOG_LEVEL=%s (applies only to tutor_pipeline + pipeline.*)", _LOG_LEVEL)

app = modal.App("coderobots-tutor")

ROOT = pathlib.Path(__file__).parent
image = (
    modal.Image.debian_slim()
    .pip_install("aiohttp", "fastapi")
    .add_local_dir(str(ROOT / "pipeline"), remote_path="/root/pipeline")
    .add_local_dir(str(ROOT / "prompts"), remote_path="/root/prompts")
)


SUMMARIZE_PROMPT_EN = (
    "You are summarising a coding tutoring conversation between a Danish student "
    "and an AI tutor. The conversation may mix Danish prose with code. Produce a "
    "concise English summary that preserves: (a) what the student is building, "
    "(b) decisions already made, (c) any code snippets verbatim inside fenced "
    "blocks, (d) unresolved questions or errors. Keep it under 400 words."
)

OUTLINE_HEADER_EN = (
    "You are an expert robotics programming tutor. Your job is to outline a solution "
    "to the student's request in English BEFORE any code is written. The next stage "
    "will use this outline to write the actual response in Danish."
)

OUTLINE_FOOTER_EN = (
    "Output format (English, not Danish):\n"
    "1. Problem (one sentence): restate what the student wants.\n"
    "2. Pseudocode plan: numbered steps describing the solution at a high level.\n"
    "3. Clarifying questions (only if the request is genuinely ambiguous; otherwise skip).\n"
    "\n"
    "Do NOT write the final code yet. Keep the outline under 500 words."
)

FINAL_HEADER_DA = (
    "Du er en venlig dansk programmerings-laerer. Skriv ALLE svar paa dansk (Dansk). "
    "Skriv kommentarer i koden paa dansk. Fortael aldrig eleven hvad deres niveau hedder."
)


def _join_sections(*parts: str) -> str:
    """Join non-empty section strings with blank-line separators."""
    return "\n\n".join(p for p in parts if p)


def _outline_system(hw: str, level: str, level_text: str, preamble: str, docs: str, examples: str) -> str:
    return _join_sections(
        OUTLINE_HEADER_EN,
        f"Hardware target: {hw}\nStudent skill level: {level}",
        level_text,
        preamble,
        f"Relevant documentation:\n{docs}" if docs else "",
        examples,
        OUTLINE_FOOTER_EN,
    )


def _final_system(
    hw: str,
    level: str,
    level_text: str,
    preamble: str,
    docs: str,
    examples: str,
    outline: str,
    code_lang: str,
) -> str:
    return _join_sections(
        FINAL_HEADER_DA,
        f"Hardware: {hw}. Elevens niveau: {level}.",
        level_text,
        preamble,
        f"Relevant dokumentation:\n{docs}" if docs else "",
        examples,
        f"Engelsk skitse (brug denne som plan, men skriv selv svaret paa dansk):\n{outline}" if outline else "",
        f"Skriv svaret paa dansk. Inkluder en kodeblok formateret som ```{code_lang} med danske kommentarer. "
        "Foelg skitsen og forklar kort omkring koden saa eleven forstaar hvad der sker.",
    )


def _user_with_context(scratch) -> str:
    """User content: stacks code/console fences before the message.

    Mirrors ChatPanel.jsx:150-154 wrapping. ESP32 wraps code as ```cpp; everything
    else uses ```python.
    """
    code_lang = "cpp" if scratch.meta.get("hw_mode") == "esp32" else "python"
    parts: list[str] = []
    if scratch.meta.get("code"):
        parts.append(f"```{code_lang}\n{scratch.meta['code']}\n```")
    if scratch.meta.get("console"):
        parts.append(f"````\n{scratch.meta['console']}\n````")
    parts.append(scratch.meta["user_msg"])
    return "\n\n".join(parts)


def _docs_text(hw_mode: str, selected: list[str]) -> str:
    from prompts import BUNDLES

    bundles = BUNDLES.get(hw_mode, {})
    return "\n\n".join(bundles[n] for n in selected if n in bundles)


def _stages():
    """Lazy import of the pipeline so module load doesn't require modal pkg."""
    from pipeline import Stage, DocRouter, call_gemma, count_messages_tokens, summarize_if_over

    class SummarizeIfOver(Stage):
        name = "summarize"
        output_budget = 800
        threshold = 5000

        async def run(self, scratch) -> None:
            tokens = count_messages_tokens(scratch.history)
            logger.info(
                "SummarizeIfOver: history=%d msgs ~%d tokens, threshold=%d",
                len(scratch.history), tokens, self.threshold,
            )
            if tokens <= self.threshold:
                scratch.artifacts[self.name] = {"status": "skipped", "tokens": tokens}
                return

            async def summarize(msgs):
                logger.info("SummarizeIfOver: invoking summary LLM call on %d msgs", len(msgs))
                return await call_gemma(
                    [{"role": "system", "content": SUMMARIZE_PROMPT_EN}, *msgs],
                    max_tokens=self.output_budget,
                )

            scratch.history = await summarize_if_over(
                scratch.history,
                threshold=self.threshold,
                summarize=summarize,
            )
            new_tokens = count_messages_tokens(scratch.history)
            logger.info(
                "SummarizeIfOver: collapsed to %d msgs ~%d tokens",
                len(scratch.history), new_tokens,
            )
            scratch.artifacts[self.name] = {
                "status": "summarized",
                "before_tokens": tokens,
                "after_tokens": new_tokens,
            }

        def progress_payload(self, scratch) -> dict:
            info = scratch.artifacts.get(self.name) or {}
            if isinstance(info, dict) and info.get("status") == "summarized":
                return {
                    "summarized": True,
                    "before_tokens": info.get("before_tokens"),
                    "after_tokens": info.get("after_tokens"),
                }
            return {"summarized": False}

    class ClassifyDocs(Stage):
        name = "doc_routing"
        output_budget = 200

        def __init__(self, hw_mode: str):
            self.hw_mode = hw_mode

        async def run(self, scratch) -> None:
            from prompts import BUNDLES

            bundles = BUNDLES.get(self.hw_mode, {})
            user_msg_preview = scratch.meta["user_msg"][:120]
            logger.info(
                "ClassifyDocs[%s]: %d candidate bundles=%s; user_msg=%r",
                self.hw_mode, len(bundles), list(bundles.keys()), user_msg_preview,
            )
            if len(bundles) <= 1:
                scratch.artifacts[self.name] = list(bundles.keys())
                logger.info(
                    "ClassifyDocs[%s]: skipping LLM (<=1 bundle), selected=%s",
                    self.hw_mode, scratch.artifacts[self.name],
                )
                return
            router = DocRouter(bundles)
            selected = await router.select(scratch.meta["user_msg"])
            if not selected:
                logger.warning(
                    "ClassifyDocs[%s]: router returned empty, falling back to all bundles",
                    self.hw_mode,
                )
                selected = list(bundles.keys())
            scratch.artifacts[self.name] = selected
            logger.info("ClassifyDocs[%s]: selected=%s", self.hw_mode, selected)

        def progress_payload(self, scratch) -> dict:
            return {"bundles": scratch.artifacts.get(self.name, [])}

    class Outline(Stage):
        name = "outline"
        output_budget = 800

        def build_messages(self, scratch) -> list[dict]:
            from prompts import EXAMPLES, LEVEL_PROMPTS, PREAMBLES

            hw = scratch.meta["hw_mode"]
            level = scratch.meta["level"]
            selected = scratch.artifacts.get("doc_routing", [])
            system = _outline_system(
                hw=hw,
                level=level,
                level_text=LEVEL_PROMPTS.get(level, ""),
                preamble=PREAMBLES.get(hw, ""),
                docs=_docs_text(hw, selected),
                examples=EXAMPLES.get(hw, ""),
            )
            logger.info(
                "Outline build_messages[%s/%s]: system=%d chars, history=%d msgs, docs from %s",
                hw, level, len(system), len(scratch.history), selected,
            )
            return [
                {"role": "system", "content": system},
                *scratch.history,
                {"role": "user", "content": _user_with_context(scratch)},
            ]

        def progress_payload(self, scratch) -> dict:
            outline = str(scratch.artifacts.get(self.name, "") or "")
            preview = outline if len(outline) <= 600 else outline[:597] + "..."
            return {"outline": preview, "outline_chars": len(outline)}

    class FinalAnswer(Stage):
        name = "final"
        output_budget = 1500

        def build_messages(self, scratch) -> list[dict]:
            from prompts import EXAMPLES, LEVEL_PROMPTS, PREAMBLES

            hw = scratch.meta["hw_mode"]
            level = scratch.meta["level"]
            selected = scratch.artifacts.get("doc_routing", [])
            outline = scratch.artifacts.get("outline", "")
            code_lang = "cpp" if hw == "esp32" else "python"
            system = _final_system(
                hw=hw,
                level=level,
                level_text=LEVEL_PROMPTS.get(level, ""),
                preamble=PREAMBLES.get(hw, ""),
                docs=_docs_text(hw, selected),
                examples=EXAMPLES.get(hw, ""),
                outline=outline,
                code_lang=code_lang,
            )
            logger.info(
                "FinalAnswer build_messages[%s/%s]: system=%d chars, history=%d msgs, outline=%d chars, lang=%s",
                hw, level, len(system), len(scratch.history), len(outline), code_lang,
            )
            return [
                {"role": "system", "content": system},
                *scratch.history,
                {"role": "user", "content": _user_with_context(scratch)},
            ]

    return SummarizeIfOver, ClassifyDocs, Outline, FinalAnswer


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
    timeout=300,
)
@modal.concurrent(max_inputs=100, target_inputs=80)
async def stream_tutor_pipeline(
    history: list[dict],
    user_msg: str,
    hw_mode: str,
    level: str,
    code: str | None = None,
    console: str | None = None,
):
    from pipeline import Linear, Scratch

    logger.info(
        "stream_tutor_pipeline: hw_mode=%s level=%s history=%d msgs user_msg=%r code=%s console=%s",
        hw_mode, level, len(history), user_msg[:120],
        f"{len(code)} chars" if code else "none",
        f"{len(console)} chars" if console else "none",
    )

    SummarizeIfOver, ClassifyDocs, Outline, FinalAnswer = _stages()

    scratch = Scratch(
        history=list(history),
        meta={
            "user_msg": user_msg,
            "hw_mode": hw_mode,
            "level": level,
            "code": code,
            "console": console,
        },
    )
    pipeline = Linear(
        [
            SummarizeIfOver(),
            ClassifyDocs(hw_mode),
            Outline(),
            FinalAnswer(),
        ]
    )
    async for evt in pipeline.execute(scratch):
        yield evt


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
)
@modal.concurrent(max_inputs=100, target_inputs=80)
@modal.fastapi_endpoint(method="POST")
async def tutor_endpoint(request: dict):
    """HTTP endpoint for the tutor pipeline.

    Expected payload:
    {
        "history": [{"role": "user|assistant", "content": "..."}],
        "user_msg": "...",
        "hw_mode": "spike" | "microbit" | "lego" | "esp32",
        "level": "beginner" | "intermediate" | "experienced",
        "code": "...",       // optional
        "console": "..."     // optional
    }
    """
    from fastapi.responses import StreamingResponse

    logger.info(
        "tutor_endpoint: keys=%s, hw_mode=%s, level=%s, history_len=%d",
        sorted(request.keys()),
        request.get("hw_mode"),
        request.get("level"),
        len(request.get("history", []) or []),
    )
    if logger.isEnabledFor(10):  # logging.DEBUG
        import json as _json
        try:
            body = _json.dumps(request, ensure_ascii=False, indent=2)
        except (TypeError, ValueError):
            body = repr(request)
        logger.debug("tutor_endpoint REQUEST BODY:\n%s\n--- end request ---", body)

    if not request.get("user_msg") or not request.get("hw_mode"):
        logger.warning("tutor_endpoint: missing user_msg or hw_mode; rejecting")
        return {"error": "user_msg and hw_mode are required"}, 400

    return StreamingResponse(
        stream_tutor_pipeline.remote_gen(
            history=request.get("history", []),
            user_msg=request["user_msg"],
            hw_mode=request["hw_mode"],
            level=request.get("level", "intermediate"),
            code=request.get("code"),
            console=request.get("console"),
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
