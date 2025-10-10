"""
Modal serverless function for streaming OpenAI chat completions.
Handles conversation history, coding level priming, and context injection.
"""

import modal
import json
from typing import AsyncIterator

# Create Modal app
app = modal.App("coderobots-openai-stream")

# Define the image with OpenAI dependency
image = modal.Image.debian_slim().pip_install("openai")


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("openai-api-key")],
    timeout=300,  # 5 minute timeout
)
async def stream_chat_completion(
    messages: list[dict],
    model: str = "gpt-4",
    max_tokens: int = 10000,
) -> AsyncIterator[str]:
    """
    Stream OpenAI chat completions using Server-Sent Events format.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: OpenAI model name
        max_tokens: Maximum tokens to generate
    
    Yields:
        JSON-formatted chunks for SSE streaming
    """
    import os
    from openai import AsyncOpenAI
    
    # Initialize OpenAI client with API key from Modal secret
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    
    try:
        # Create streaming completion
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True,
        )
        
        # Stream chunks as SSE format
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta.content:
                    # Format as SSE data
                    data = json.dumps({
                        "type": "content",
                        "content": delta.content
                    })
                    yield f"data: {data}\n\n"
        
        # Send completion signal
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        # Send error message
        error_data = json.dumps({
            "type": "error",
            "error": str(e)
        })
        yield f"data: {error_data}\n\n"


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("openai-api-key")],
)
@modal.web_endpoint(method="POST")
async def chat_endpoint(request: dict):
    """
    HTTP endpoint for chat requests.
    Accepts JSON payload with conversation data.
    
    Expected payload:
    {
        "messages": [{"role": "system|user|assistant", "content": "..."}],
        "model": "gpt-5-nano",
        "max_tokens": 10000
    }
    """
    from fastapi.responses import StreamingResponse
    
    # Extract parameters
    messages = request.get("messages", [])
    model = request.get("model", "gpt-5-nano")
    max_tokens = request.get("max_tokens", 10000)
    
    if not messages:
        return {"error": "No messages provided"}, 400
    
    # Return streaming response
    return StreamingResponse(
        stream_chat_completion.remote_gen(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )

