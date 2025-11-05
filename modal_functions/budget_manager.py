"""
Budget Manager - Model-agnostic budget tracking and usage logging.
Handles budget checks, usage logging, and cost calculation for OpenAI models.
"""

import os
from datetime import datetime, timezone, timedelta
import pytz
from typing import Optional, Dict, Any


# Budget configuration (in USD per week)
EN1_WEEKLY_BUDGET = float(os.environ.get("EN1_WEEKLY_BUDGET", "1.00"))
STANDARD_WEEKLY_BUDGET = float(os.environ.get("STANDARD_WEEKLY_BUDGET", "0.50"))

# Token pricing (per 1M tokens in USD) - only for OpenAI models
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


def get_week_boundaries_et():
    """Get the start and end of the current week (Monday-Sunday) in Eastern Time."""
    et_tz = pytz.timezone('US/Eastern')
    now_et = datetime.now(et_tz)
    
    # Get Monday of current week (weekday 0 = Monday)
    days_since_monday = now_et.weekday()
    week_start = now_et.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = week_start - timedelta(days=days_since_monday)
    
    # Get Sunday end of week
    week_end = week_start + timedelta(days=7)
    
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


def calculate_cost(model: str, input_tokens: int, output_tokens: int, 
                   cached_input_tokens: int, reasoning_tokens: int) -> float:
    """Calculate cost in USD based on token usage. Only works for OpenAI models."""
    if model not in TOKEN_PRICING:
        raise ValueError(f"Cost calculation not supported for model: {model}")
    
    pricing = TOKEN_PRICING[model]
    
    # Calculate costs (divide by 1M since pricing is per 1M tokens)
    regular_input_cost = (input_tokens - cached_input_tokens) * pricing["input"] / 1_000_000
    cached_cost = cached_input_tokens * pricing["cached_input"] / 1_000_000
    output_cost = output_tokens * pricing["output"] / 1_000_000
    # Reasoning tokens are charged at output rate
    reasoning_cost = reasoning_tokens * pricing["output"] / 1_000_000
    
    total_cost = regular_input_cost + cached_cost + output_cost + reasoning_cost
    return round(total_cost, 6)


async def log_usage(supabase_client, user_id: str, model: str, 
                   input_tokens: int, output_tokens: int, 
                   cached_input_tokens: int, reasoning_tokens: int, cost: float):
    """Log usage to the ai_usage table."""
    try:
        print(f"Logging usage: {user_id}, {model}, {input_tokens}, {output_tokens}, {cached_input_tokens}, {reasoning_tokens}, {cost}")
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


async def check_budget(supabase_client, user_id: str, access_level: str, model: str, provider: str):
    """
    Check if user has budget remaining for the request.
    SkoleGPT models bypass budget checks.
    
    Returns:
        bool: True if request should proceed, False if budget exceeded
    """
    # SkoleGPT models bypass budget checks
    if provider == "skolegpt":
        return True
    
    # Check budget for OpenAI models
    if access_level == 'standard':
        weekly_spend = await get_weekly_spend(supabase_client, user_id)
        if weekly_spend >= STANDARD_WEEKLY_BUDGET:
            raise ValueError("User has exceeded their budget")
    elif access_level == 'en1':
        if model != 'gpt-5-nano':
            weekly_spend = await get_weekly_spend(supabase_client, user_id)
            if weekly_spend >= EN1_WEEKLY_BUDGET:
                raise ValueError("User has exceeded their budget")
        # EN1 users have unlimited gpt-5-nano
    else:
        raise ValueError("Invalid access level")
    
    return True

