"""Modal serverless function for streaming SkoleGPT responses.

The single-shot Gemma call and SSE framing live in the `pipeline` package next to
this file. This module is the thin endpoint adapter: it wires up the Modal app,
mounts `pipeline` into the container image, and exposes the FastAPI HTTP endpoint.
"""

import logging
import pathlib

import modal

logger = logging.getLogger(__name__)

app = modal.App("coderobots-skolegpt-stream")

PIPELINE_DIR = pathlib.Path(__file__).parent / "pipeline"

image = (
    modal.Image.debian_slim()
    .pip_install("aiohttp", "fastapi")
    .add_local_dir(str(PIPELINE_DIR), remote_path="/root/pipeline")
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
    timeout=300,
)
@modal.concurrent(max_inputs=100, target_inputs=80)
async def stream_skolegpt_completion(messages: list[dict]):
    """Stream Gemma's response as SSE events for a single chat request."""
    from pipeline import as_sse, stream_gemma

    async for evt in as_sse(stream_gemma(messages)):
        yield evt


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
)
@modal.concurrent(max_inputs=100, target_inputs=80)
@modal.fastapi_endpoint(method="POST")
async def chat_endpoint(request: dict):
    """HTTP endpoint for chat requests.

    Expected payload:
    {
        "messages": [{"role": "system|user|assistant", "content": "..."}],
    }
    """
    from fastapi.responses import StreamingResponse

    messages = request.get("messages", [])

    if not messages:
        return {"error": "No messages provided"}, 400

    return StreamingResponse(
        stream_skolegpt_completion.remote_gen(
            messages=messages,
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
