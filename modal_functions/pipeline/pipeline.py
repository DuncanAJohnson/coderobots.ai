"""Pipeline executors: Linear (sequential) and FanOut (parallel + assemble).

Pipelines yield SSE-shaped strings (already wrapped in `data: {...}\\n\\n` framing)
so the caller can pass the generator straight to a FastAPI StreamingResponse.

Composition: a FanOut may be placed anywhere inside a Linear's stage list. A FanOut
as the final stage of a Linear is supported but the assembled output is emitted as
a single content event rather than streamed token-by-token.
"""

import asyncio
import logging
import time
from typing import AsyncIterator, Callable

from .llm import call_gemma, stream_gemma
from .sse import content_event, done_event, error_event, progress_event
from .stage import Scratch, Stage

logger = logging.getLogger(__name__)


def _safe_payload(stage: Stage, scratch: Scratch) -> dict:
    try:
        return stage.progress_payload(scratch) or {}
    except Exception:
        logger.exception("progress_payload failed for stage %s", stage.name)
        return {}


class FanOut:
    """Run N stages in parallel against the same scratch, then assemble their outputs.

    Each stage's parsed output is stored in scratch.artifacts under its name.
    The assembled output is stored under FanOut.name.
    """

    def __init__(
        self,
        stages: list[Stage],
        *,
        name: str,
        assemble: Callable[[dict], object],
    ):
        self.stages = stages
        self.name = name
        self.assemble = assemble
        self.output_budget = 0  # not directly used; each child has its own budget

    async def run(self, scratch: Scratch) -> None:
        async def run_one(stage: Stage):
            t0 = time.monotonic()
            messages = stage.build_messages(scratch)
            logger.info(
                "FanOut[%s].child=%s start: messages=%d",
                self.name, stage.name, len(messages),
            )
            response = await call_gemma(messages, max_tokens=stage.output_budget)
            logger.info(
                "FanOut[%s].child=%s done: %d chars in %.2fs",
                self.name, stage.name, len(response), time.monotonic() - t0,
            )
            return stage.name, stage.parse(response)

        t0 = time.monotonic()
        logger.info("FanOut[%s] start: %d children", self.name, len(self.stages))
        results = await asyncio.gather(*(run_one(s) for s in self.stages))
        section_outputs = dict(results)
        for k, v in section_outputs.items():
            scratch.artifacts[k] = v
        scratch.artifacts[self.name] = self.assemble(section_outputs)
        logger.info("FanOut[%s] done in %.2fs", self.name, time.monotonic() - t0)

    def progress_payload(self, scratch: Scratch) -> dict:
        return {}


class Linear:
    """Run stages in order. The last stage streams content tokens to the client by default.

    Intermediate stages are awaited fully and emit one progress event each. The
    existing aiStream.js client (src/utils/aiStream.js) silently ignores unknown
    event types, so progress events are safe to emit by default.
    """

    def __init__(self, stages: list, *, stream_final: bool = True):
        self.stages = stages
        self.stream_final = stream_final

    async def execute(self, scratch: Scratch) -> AsyncIterator[str]:
        pipeline_t0 = time.monotonic()
        logger.info(
            "Linear.execute start: %d stages [%s]",
            len(self.stages),
            ", ".join(getattr(s, "name", type(s).__name__) for s in self.stages),
        )
        try:
            for i, stage in enumerate(self.stages):
                is_final = i == len(self.stages) - 1
                stage_t0 = time.monotonic()
                stage_label = f"{i+1}/{len(self.stages)} {stage.name}"
                logger.info("stage %s: start", stage_label)

                if isinstance(stage, FanOut):
                    await stage.run(scratch)
                    yield progress_event(stage.name, payload=_safe_payload(stage, scratch))
                    logger.info(
                        "stage %s: done in %.2fs", stage_label, time.monotonic() - stage_t0
                    )
                    if is_final and self.stream_final:
                        yield content_event(str(scratch.artifacts.get(stage.name, "")))
                elif is_final and self.stream_final:
                    messages = stage.build_messages(scratch)
                    logger.info(
                        "stage %s: streaming, %d messages, max_tokens=%d",
                        stage_label, len(messages), stage.output_budget,
                    )
                    chunks: list[str] = []
                    token_count = 0
                    async for token in stream_gemma(
                        messages, max_tokens=stage.output_budget
                    ):
                        chunks.append(token)
                        token_count += 1
                        yield content_event(token)
                    scratch.artifacts[stage.name] = stage.parse("".join(chunks))
                    logger.info(
                        "stage %s: streamed %d tokens (%d chars) in %.2fs",
                        stage_label, token_count, sum(len(c) for c in chunks),
                        time.monotonic() - stage_t0,
                    )
                else:
                    await stage.run(scratch)
                    yield progress_event(stage.name, payload=_safe_payload(stage, scratch))
                    logger.info(
                        "stage %s: done in %.2fs", stage_label, time.monotonic() - stage_t0
                    )
            yield done_event()
            logger.info(
                "Linear.execute complete in %.2fs", time.monotonic() - pipeline_t0
            )
        except Exception as e:
            logger.exception(
                "Linear.execute: pipeline failed after %.2fs",
                time.monotonic() - pipeline_t0,
            )
            yield error_event(str(e))
