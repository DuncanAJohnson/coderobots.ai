"""SkoleGPT call primitives. Pure text in, pure text out — no SSE framing.

Speaks the same OpenAI-compatible SSE proxy protocol as
providers/skolegpt_provider.py (same SKOLEGPT_API_URL/KEY, same
`skolegpt-credentials` Modal secret) — the provider serves single-call
chat_with_budget requests, these primitives serve the multi-stage tutor
pipeline. Keep wire-format changes in sync between the two.
"""

import json
import logging
import os
import time
from typing import AsyncIterator

logger = logging.getLogger(__name__)


async def stream_gemma(
    messages: list[dict],
    *,
    max_tokens: int | None = None,
    temperature: float = 0.7,
) -> AsyncIterator[str]:
    """Stream Gemma's response one content delta at a time.

    Reads SKOLEGPT_API_URL and SKOLEGPT_API_KEY from the environment.
    Raises RuntimeError on misconfiguration or upstream HTTP errors.
    """
    import aiohttp

    api_url = os.environ.get("SKOLEGPT_API_URL")
    api_key = os.environ.get("SKOLEGPT_API_KEY")
    if not api_url or not api_key:
        raise RuntimeError("SKOLEGPT_API_URL and SKOLEGPT_API_KEY must be set")

    total_chars = sum(len(m.get("content", "")) for m in messages)
    logger.info(
        "stream_gemma: %d messages, ~%d input chars (~%d tokens), max_tokens=%s, temp=%.2f",
        len(messages), total_chars, total_chars // 4, max_tokens, temperature,
    )
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug("stream_gemma INPUT (%d messages):", len(messages))
        for i, m in enumerate(messages):
            content = m.get("content", "")
            logger.debug(
                "  [%d/%d %s] (%d chars)\n%s\n--- end message %d ---",
                i + 1, len(messages), m.get("role", "?"), len(content), content, i + 1,
            )
    t0 = time.monotonic()
    yielded_chars = 0
    yielded_tokens = 0
    debug_chunks: list[str] = [] if logger.isEnabledFor(logging.DEBUG) else None  # type: ignore[assignment]

    payload: dict = {
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "stream": True,
        "model": os.environ.get("TUTOR_MODEL", "google/gemma-4-26B-A4B-it"),
        "temperature": temperature,
        "presence_penalty": 0,
        "frequency_penalty": 0,
        "top_p": 0.95,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream",
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(api_url, json=payload, headers=headers) as response:
            if response.status >= 400:
                error_text = await response.text()
                logger.warning(
                    f"SkoleGPT API error {response.status}: {error_text[:200]}"
                )
                raise RuntimeError(
                    f"SkoleGPT API error {response.status}: {error_text[:200]}"
                )

            buffer = b""
            async for chunk in response.content.iter_any():
                buffer += chunk
                while b"\n" in buffer:
                    line_bytes, buffer = buffer.split(b"\n", 1)
                    line_str = line_bytes.decode("utf-8", errors="ignore").strip()
                    if not line_str or not line_str.startswith("data: "):
                        continue
                    data_str = line_str[6:]
                    if data_str == "[DONE]":
                        logger.info(
                            "stream_gemma done: %d tokens, %d chars in %.2fs",
                            yielded_tokens, yielded_chars, time.monotonic() - t0,
                        )
                        if debug_chunks is not None:
                            full = "".join(debug_chunks)
                            logger.debug(
                                "stream_gemma OUTPUT (%d chars):\n%s\n--- end output ---",
                                len(full), full,
                            )
                        return
                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError as e:
                        logger.warning(
                            f"SkoleGPT stream: failed to parse JSON {data_str[:100]}: {e}"
                        )
                        continue
                    choices = data.get("choices") or []
                    if not choices:
                        continue
                    choice = choices[0]
                    content = (choice.get("delta") or {}).get("content")
                    if content:
                        yielded_tokens += 1
                        yielded_chars += len(content)
                        if debug_chunks is not None:
                            debug_chunks.append(content)
                        yield content
                    if choice.get("finish_reason"):
                        logger.info(
                            "stream_gemma finished (%s): %d tokens, %d chars in %.2fs",
                            choice.get("finish_reason"), yielded_tokens, yielded_chars,
                            time.monotonic() - t0,
                        )
                        if debug_chunks is not None:
                            full = "".join(debug_chunks)
                            logger.debug(
                                "stream_gemma OUTPUT (%d chars):\n%s\n--- end output ---",
                                len(full), full,
                            )
                        return


async def call_gemma(
    messages: list[dict],
    *,
    max_tokens: int | None = None,
    temperature: float = 0.7,
) -> str:
    """Call Gemma and return the full response as a single string.

    Implemented as a collector over stream_gemma, so the wire format and error
    behavior match the streaming path exactly.
    """
    chunks: list[str] = []
    async for token in stream_gemma(
        messages, max_tokens=max_tokens, temperature=temperature
    ):
        chunks.append(token)
    return "".join(chunks)
