"""
Modal serverless function for streaming OpenAI responses with budget tracking.
Handles token usage logging, budget enforcement, and access level management.
"""

import modal
import json
import os
from typing import AsyncIterator
from datetime import datetime, timezone
import pytz

# Create Modal app
app = modal.App("coderobots-openai-stream-budget")

# Define the image with dependencies
image = modal.Image.debian_slim().pip_install(
    "openai",
    "supabase",
    "pytz"
)

# Budget configuration (in USD per week)
EN1_WEEKLY_BUDGET = float(os.environ.get("EN1_WEEKLY_BUDGET", "10.00"))
STANDARD_WEEKLY_BUDGET = float(os.environ.get("STANDARD_WEEKLY_BUDGET", "2.00"))

# Token pricing (per 1M tokens in USD)
TOKEN_PRICING = {
    "gpt-5": {
        "input": 1.25,
        "cached_input": 0.13,
        "output": 10.00,
    },
    "gpt-5-mini": {
        "input": 0.25,
        "cached_input": 0.03,
        "output": 2.00,
    },
    "gpt-5-nano": {
        "input": 0.05,
        "cached_input": 0.01,
        "output": 0.40,
    },
}


def calculate_cost(model: str, input_tokens: int, output_tokens: int, 
                   cached_input_tokens: int, reasoning_tokens: int) -> float:
    """Calculate cost in USD based on token usage."""
    if model not in TOKEN_PRICING:
        raise ValueError(f"Unknown model: {model}")
    
    pricing = TOKEN_PRICING[model]
    
    # Calculate costs (divide by 1M since pricing is per 1M tokens)
    regular_input_cost = (input_tokens - cached_input_tokens) * pricing["input"] / 1_000_000
    cached_cost = cached_input_tokens * pricing["cached_input"] / 1_000_000
    output_cost = output_tokens * pricing["output"] / 1_000_000
    # Reasoning tokens are charged at output rate
    reasoning_cost = reasoning_tokens * pricing["output"] / 1_000_000
    
    total_cost = regular_input_cost + cached_cost + output_cost + reasoning_cost
    return round(total_cost, 6)


def get_week_boundaries_et():
    """Get the start and end of the current week (Monday-Sunday) in Eastern Time."""
    et_tz = pytz.timezone('US/Eastern')
    now_et = datetime.now(et_tz)
    
    # Get Monday of current week (weekday 0 = Monday)
    days_since_monday = now_et.weekday()
    week_start = now_et.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = week_start - pytz.timedelta(days=days_since_monday)
    
    # Get Sunday end of week
    week_end = week_start + pytz.timedelta(days=7)
    
    return week_start, week_end


async def verify_auth_and_get_access_level(supabase_client, user_id: str, auth_token: str):
    """Verify the auth token and get user's access level."""
    try:
        # Verify the user exists and token is valid
        user = supabase_client.auth.get_user(auth_token)
        
        if not user or user.user.id != user_id:
            raise ValueError("Invalid authentication")
        
        # Get access level from user metadata
        access_level = user.user.user_metadata.get('access_level', 'standard')
        
        return access_level
    except Exception as e:
        raise ValueError(f"Authentication failed: {str(e)}")


async def get_weekly_spend(supabase_client, user_id: str):
    """Get total spend for the current week."""
    week_start, week_end = get_week_boundaries_et()
    
    # Query ai_usage table with service role to bypass RLS
    result = supabase_client.table('ai_usage') \
        .select('cost_usd') \
        .eq('user_id', user_id) \
        .gte('timestamp', week_start.isoformat()) \
        .lt('timestamp', week_end.isoformat()) \
        .execute()
    
    total_spend = sum(row['cost_usd'] for row in result.data)
    return float(total_spend)


async def log_usage(supabase_client, user_id: str, model: str, 
                   input_tokens: int, output_tokens: int, 
                   cached_input_tokens: int, reasoning_tokens: int, cost: float):
    """Log usage to the ai_usage table."""
    try:
        supabase_client.table('ai_usage').insert({
            'user_id': user_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'model': model,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cached_input_tokens': cached_input_tokens,
            'reasoning_tokens': reasoning_tokens,
            'cost_usd': cost,
        }).execute()
    except Exception as e:
        print(f"Error logging usage: {str(e)}")
        raise


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("openai-api-key"),
        modal.Secret.from_name("supabase-en1-credentials"),
        modal.Secret.from_name("supabase-showcase-credentials"),
    ],
    timeout=300,  # 5 minute timeout
)
async def stream_chat_completion_with_budget(
    messages: list[dict],
    user_id: str,
    auth_token: str,
    environment: str = "EN1",
    model: str = "gpt-5-nano",
    max_tokens: int = 100000,
) -> AsyncIterator[str]:
    """
    Stream OpenAI responses with budget tracking and enforcement.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        user_id: Supabase user ID
        auth_token: Supabase auth token for verification
        environment: Supabase environment to use ('EN1' or 'SHOWCASE')
        model: OpenAI model name
        max_tokens: Maximum tokens to generate
    
    Yields:
        JSON-formatted chunks for SSE streaming
    """
    from openai import AsyncOpenAI
    from supabase import create_client, Client
    
    # Initialize clients
    openai_client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # Configure Supabase based on environment parameter
    if environment == "EN1":
        supabase_url = os.environ["SUPABASE_EN1_URL"]
        supabase_key = os.environ["SUPABASE_EN1_SERVICE_ROLE_KEY"]
    elif environment == "SHOWCASE":
        supabase_url = os.environ["SUPABASE_SHOWCASE_URL"]
        supabase_key = os.environ["SUPABASE_SHOWCASE_SERVICE_ROLE_KEY"]
    else:
        raise ValueError(f"Unsupported environment: {environment}")

    supabase_client = create_client(supabase_url, supabase_key)
    
    usage_data = None
    
    try:
        # Verify authentication and get access level
        access_level = await verify_auth_and_get_access_level(
            supabase_client, user_id, auth_token
        )
        
        # Convert messages to new Responses API format
        instructions = None
        input_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                # Combine system messages into instructions
                if instructions is None:
                    instructions = msg["content"]
                else:
                    instructions += "\n\n" + msg["content"]
            else:
                # Convert user/assistant messages to input format
                input_messages.append({
                    "type": "message",
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Build request parameters for new Responses API
        request_params = {
            "model": model,
            "input": input_messages,
            "max_output_tokens": max_tokens,
            "stream": True,
            "text": {
                "format": {
                    "type": "text"
                }
            }
        }
        
        # Add instructions if system messages were present
        if instructions:
            request_params["instructions"] = instructions

        # Only allow a streaming response if the user has a budget
        if access_level == 'standard':
            weekly_spend = await get_weekly_spend(supabase_client, user_id)
            if weekly_spend >= STANDARD_WEEKLY_BUDGET:
                raise ValueError("User has exceeded their budget")
        elif access_level == 'en1':
            if model != 'gpt-5-nano':
                weekly_spend = await get_weekly_spend(supabase_client, user_id)
                if weekly_spend >= EN1_WEEKLY_BUDGET:
                    raise ValueError("User has exceeded their budget")
            else:
                # EN1 users have unlimited gpt-5-nano
                pass
        else:
            raise ValueError("Invalid access level")
        
        # Create streaming response with new API
        stream = await openai_client.responses.create(**request_params)
        
        # Stream chunks as SSE format
        async for event in stream:
            # Handle different event types from the Responses API
            if hasattr(event, 'type'):
                # Handle text delta events - the main streaming content
                if event.type == "response.output_text.delta":
                    if hasattr(event, 'delta') and event.delta:
                        data = json.dumps({
                            "type": "content",
                            "content": event.delta
                        })
                        yield f"data: {data}\n\n"
                
                # Capture usage data from done event
                elif event.type == "response.done":
                    if hasattr(event, 'response') and hasattr(event.response, 'usage'):
                        usage = event.response.usage
                        usage_data = {
                            'input_tokens': getattr(usage, 'input_tokens', 0),
                            'output_tokens': getattr(usage, 'output_tokens', 0),
                            'cached_input_tokens': getattr(usage, 'input_tokens_details', {}).get('cached_tokens', 0) if hasattr(usage, 'input_tokens_details') else 0,
                            'reasoning_tokens': getattr(usage, 'output_tokens_details', {}).get('reasoning_tokens', 0) if hasattr(usage, 'output_tokens_details') else 0,
                        }
        
        # After streaming, log usage and check budget
        if usage_data:
            # Calculate cost
            cost = calculate_cost(
                model,
                usage_data['input_tokens'],
                usage_data['output_tokens'],
                usage_data['cached_input_tokens'],
                usage_data['reasoning_tokens']
            )
            
            # Log usage to database
            await log_usage(
                supabase_client,
                user_id,
                model,
                usage_data['input_tokens'],
                usage_data['output_tokens'],
                usage_data['cached_input_tokens'],
                usage_data['reasoning_tokens'],
                cost
            )
            
            # Get total weekly spend AFTER logging this request
            weekly_spend = await get_weekly_spend(supabase_client, user_id)
            
            # Check budget status
            has_budget = True
            budget_limit = STANDARD_WEEKLY_BUDGET
            
            if access_level == 'en1':
                budget_limit = EN1_WEEKLY_BUDGET
                # EN1 users have unlimited gpt-5-nano
                if model != 'gpt-5-nano':
                    has_budget = weekly_spend < EN1_WEEKLY_BUDGET
            else:
                # Standard users check budget for all models
                has_budget = weekly_spend < STANDARD_WEEKLY_BUDGET
            
            # Send budget status
            budget_status = {
                "type": "budget_status",
                "has_budget": has_budget,
                "access_level": access_level,
                "weekly_spend": weekly_spend,
                "budget_limit": budget_limit,
                "model": model,
                "usage": usage_data,
                "cost": cost
            }
            yield f"data: {json.dumps(budget_status)}\n\n"
        
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
    secrets=[
        modal.Secret.from_name("openai-api-key"),
        modal.Secret.from_name("supabase-credentials"),
    ],
)
@modal.fastapi_endpoint(method="POST")
async def chat_endpoint_with_budget(request: dict):
    """
    HTTP endpoint for chat requests with budget tracking.
    
    Expected payload:
    {
        "messages": [{"role": "system|user|assistant", "content": "..."}],
        "user_id": "uuid",
        "auth_token": "jwt_token",
        "environment": "EN1",
        "model": "gpt-5-nano",
        "max_tokens": 10000
    }
    """
    from fastapi.responses import StreamingResponse
    
    # Extract parameters
    messages = request.get("messages", [])
    user_id = request.get("user_id")
    auth_token = request.get("auth_token")
    environment = request.get("environment", "EN1")
    model = request.get("model", "gpt-5-nano")
    max_tokens = request.get("max_tokens", 100000)
    
    if not messages:
        return {"error": "No messages provided"}, 400
    
    if not user_id or not auth_token:
        return {"error": "Missing authentication"}, 401
    
    # Return streaming response
    return StreamingResponse(
        stream_chat_completion_with_budget.remote_gen(
            messages=messages,
            user_id=user_id,
            auth_token=auth_token,
            environment=environment,
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

