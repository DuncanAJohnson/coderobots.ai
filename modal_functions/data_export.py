"""
Modal serverless function for admin data export.
Allows admins to export message data with filters for time range, users, and columns.
"""

import modal
import json
import os
import csv
import io
from typing import Optional, List
from pathlib import Path

# Create Modal app
app = modal.App("coderobots-data-export")

# Path to schema file (relative to this file)
SCHEMA_FILE = Path(__file__).parent / "db_schemas.json"

# Define the image with dependencies
image = (
    modal.Image.debian_slim()
    .pip_install(
        "supabase",
        "fastapi[standard]",
    )
    .add_local_file(SCHEMA_FILE, "/app/db_schemas.json")
)


def get_message_columns() -> List[str]:
    """Load valid message columns from the schema file."""
    # Check if running in Modal (file mounted at /app) or locally
    if os.path.exists("/app/db_schemas.json"):
        schema_path = "/app/db_schemas.json"
    else:
        schema_path = SCHEMA_FILE
    
    with open(schema_path, "r") as f:
        schema = json.load(f)
    
    return list(schema["schemas"]["message"]["properties"].keys())


async def verify_admin(supabase_client, user_id: str, auth_token: str) -> bool:
    """Verify the user is authenticated and is an admin."""
    try:
        # Verify the user exists and token is valid
        user = supabase_client.auth.get_user(auth_token)
        
        if not user or user.user.id != user_id:
            raise ValueError("Invalid authentication")
        
        # Check if user is in admins table (using service role bypasses RLS)
        result = supabase_client.table('admins') \
            .select('id') \
            .eq('user_id', user_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise ValueError("User is not an admin")
        
        return True
    except Exception as e:
        raise ValueError(f"Admin verification failed: {str(e)}")


async def emails_to_user_ids(supabase_client, emails: List[str]) -> List[str]:
    """Convert a list of emails to user IDs using Supabase auth admin API."""
    if not emails:
        return []
    
    # Normalize emails to lowercase for comparison
    emails_lower = [email.lower() for email in emails]
    
    # Get all users from auth admin API
    users_response = supabase_client.auth.admin.list_users()
    
    # Filter users by email and extract user IDs
    user_ids = []
    for user in users_response:
        if user.email and user.email.lower() in emails_lower:
            user_ids.append(user.id)
    
    return user_ids


async def export_messages(
    supabase_client,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    emails: Optional[List[str]] = None,
    columns: Optional[List[str]] = None,
) -> List[dict]:
    """Export messages with filters."""
    valid_columns = get_message_columns()
    
    # Use specified columns or all columns
    selected_columns = columns if columns else valid_columns
    
    # Validate columns
    for col in selected_columns:
        if col not in valid_columns:
            raise ValueError(f"Invalid column: {col}")
    
    # Convert emails to user IDs if provided
    user_ids = None
    if emails and len(emails) > 0:
        user_ids = await emails_to_user_ids(supabase_client, emails)
        if not user_ids:
            # No matching users found - return empty result
            return []
    
    # Build query
    query = supabase_client.table('messages').select(','.join(selected_columns))
    
    # Apply time filters
    if start_time:
        query = query.gte('timestamp', start_time)
    if end_time:
        query = query.lte('timestamp', end_time)
    
    # Apply user filter
    if user_ids and len(user_ids) > 0:
        query = query.in_('user_id', user_ids)
    
    # Order by timestamp
    query = query.order('timestamp', desc=False)
    
    # Execute query
    result = query.execute()
    
    return result.data


def convert_to_csv(data: List[dict], columns: List[str]) -> str:
    """Convert data to CSV string."""
    if not data:
        return ''
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue()


@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("supabase-showcase-credentials"),
    ],
    timeout=600,  # 10 minute timeout for large exports
)
async def export_data(
    user_id: str,
    auth_token: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    emails: Optional[List[str]] = None,
    columns: Optional[List[str]] = None,
    format: str = "json",  # "json" or "csv"
) -> dict:
    """
    Export message data with filters.
    Only accessible to admins.
    
    Args:
        user_id: Admin user ID
        auth_token: Admin auth token
        start_time: ISO timestamp filter (inclusive)
        end_time: ISO timestamp filter (inclusive)
        emails: List of user emails to filter by
        columns: List of columns to include
        format: Output format ("json" or "csv")
    
    Returns:
        dict with success status and data/error
    """
    from supabase import create_client
    
    supabase_url = os.environ["SUPABASE_SHOWCASE_URL"]
    supabase_key = os.environ["SUPABASE_SHOWCASE_SERVICE_ROLE_KEY"]
    
    supabase_client = create_client(supabase_url, supabase_key)
    
    try:
        # Verify admin access
        await verify_admin(supabase_client, user_id, auth_token)
        
        # Use provided columns or default to all
        selected_columns = columns if columns else get_message_columns()
        
        # Export messages
        data = await export_messages(
            supabase_client,
            start_time=start_time,
            end_time=end_time,
            emails=emails,
            columns=selected_columns,
        )
        
        # Format output
        if format == "csv":
            csv_data = convert_to_csv(data, selected_columns)
            return {
                "success": True,
                "format": "csv",
                "data": csv_data,
                "row_count": len(data),
            }
        else:
            return {
                "success": True,
                "format": "json",
                "data": data,
                "row_count": len(data),
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# HTTP endpoint for web access
@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("supabase-showcase-credentials"),
    ],
    timeout=600,
)
@modal.fastapi_endpoint(method="POST")
async def export_endpoint(request: dict):
    """HTTP endpoint for data export."""
    user_id = request.get("user_id")
    auth_token = request.get("auth_token")
    start_time = request.get("start_time")
    end_time = request.get("end_time")
    emails = request.get("emails")
    columns = request.get("columns")
    format = request.get("format", "json")
    
    if not user_id or not auth_token:
        return {"success": False, "error": "Missing authentication"}
    
    return export_data.remote(
        user_id=user_id,
        auth_token=auth_token,
        start_time=start_time,
        end_time=end_time,
        emails=emails,
        columns=columns,
        format=format,
    )

