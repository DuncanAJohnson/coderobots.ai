"""
Modal serverless function for streaming SkoleGPT responses.
"""

import modal
import json
import os
import logging
from typing import AsyncIterator

logger = logging.getLogger(__name__)

# Create Modal app
app = modal.App("coderobots-skolegpt-stream")

# Define the image with aiohttp
image = modal.Image.debian_slim().pip_install("aiohttp")


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
    timeout=300,  # 5 minute timeout
)
async def stream_skolegpt_completion(
    messages: list[dict],
) -> AsyncIterator[str]:
    """
    Stream SkoleGPT responses.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
    
    Yields:
        JSON-formatted chunks for SSE streaming
    """
    import aiohttp
    
    api_url = os.environ.get("SKOLEGPT_API_URL")
    api_key = os.environ.get("SKOLEGPT_API_KEY")
    
    if not api_url or not api_key:
        error_data = json.dumps({
            "type": "error",
            "error": "SKOLEGPT_API_URL and SKOLEGPT_API_KEY must be set"
        })
        yield f"data: {error_data}\n\n"
        return
    
    try:
        # Prepare messages for SkoleGPT API (OpenAI format)
        api_messages = []
        for msg in messages:
            api_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Build payload
        payload = {
            "messages": api_messages,
            "stream": True,
            "model": "skolegpt-v3",
            "temperature": 0.7,
            "presence_penalty": 0,
            "frequency_penalty": 0,
            "top_p": 0.95,
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "text/event-stream"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, json=payload, headers=headers) as response:
                if not response.ok:
                    error_text = await response.text()
                    error_data = json.dumps({
                        "type": "error",
                        "error": f"SkoleGPT API error: {response.status} - {error_text}"
                    })
                    yield f"data: {error_data}\n\n"
                    return
                
                # Handle SSE streaming
                buffer = b''
                async for chunk in response.content.iter_any():
                    buffer += chunk
                    
                    # Process complete lines
                    while b'\n' in buffer:
                        line_bytes, buffer = buffer.split(b'\n', 1)
                        line_str = line_bytes.decode('utf-8', errors='ignore').strip()
                        
                        if not line_str:
                            continue
                        
                        # Parse SSE format: "data: {json}\n\n"
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove "data: " prefix
                            
                            if data_str == '[DONE]':
                                logger.debug("SkoleGPT stream: Received [DONE] marker")
                                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                                return
                            
                            try:
                                data = json.loads(data_str)
                                
                                # Extract content from SkoleGPT response format
                                # SkoleGPT uses OpenAI-compatible format with choices[].delta
                                if 'choices' in data and len(data['choices']) > 0:
                                    choice = data['choices'][0]
                                    delta = choice.get('delta', {})
                                    finish_reason = choice.get('finish_reason')
                                    
                                    # Handle content delta
                                    if 'content' in delta and delta['content']:
                                        content_data = json.dumps({
                                            "type": "content",
                                            "content": delta['content']
                                        })
                                        yield f"data: {content_data}\n\n"
                                    
                                    # Handle finish reason (stream complete)
                                    if finish_reason:
                                        logger.debug(f"SkoleGPT stream finished: finish_reason={finish_reason}")
                                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                                        return
                                        
                            except json.JSONDecodeError as e:
                                logger.warning(f"SkoleGPT stream: Failed to parse JSON: {data_str[:100]}... Error: {e}")
                                continue
        
        # Send completion signal if we reach here
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
    secrets=[modal.Secret.from_name("skolegpt-credentials")],
)
@modal.fastapi_endpoint(method="POST")
async def chat_endpoint(request: dict):
    """
    HTTP endpoint for chat requests.
    
    Expected payload:
    {
        "messages": [{"role": "system|user|assistant", "content": "..."}],
    }
    """
    from fastapi.responses import StreamingResponse
    
    # Extract parameters
    messages = request.get("messages", [])
    
    if not messages:
        return {"error": "No messages provided"}, 400
    
    # Return streaming response
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
        }
    )
