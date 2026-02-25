"""
Modal cron job that writes a heartbeat row to Supabase to prevent idle pausing.
"""

import os
from datetime import datetime, timezone

import modal


app = modal.App("coderobots-supabase-keepalive")

image = modal.Image.debian_slim().pip_install("supabase")


@app.function(
    image=image,
    schedule=modal.Cron("0 */24 * * *", timezone="UTC"),
    secrets=[modal.Secret.from_name("supabase-showcase-credentials")],
    timeout=60,
)
def ping_supabase_keepalive() -> dict:
    """
    Upsert a heartbeat row in app_config so the database receives regular writes.
    """
    from supabase import create_client

    supabase_client = create_client(
        os.environ["SUPABASE_SHOWCASE_URL"],
        os.environ["SUPABASE_SHOWCASE_SERVICE_ROLE_KEY"],
    )

    heartbeat_key = "system.supabase_keepalive"
    heartbeat_value = {
        "source": "modal-cron",
        "status": "ok",
        "purpose": "prevent_free_tier_pause",
        "last_ping_at": datetime.now(timezone.utc).isoformat(),
    }

    response = (
        supabase_client.table("app_config")
        .upsert(
            {
                "key": heartbeat_key,
                "value": heartbeat_value,
            },
            on_conflict="key",
        )
        .execute()
    )

    print(response)

    print(f"Keepalive write completed for key: {heartbeat_key}")
    return {
        "success": True,
        "key": heartbeat_key,
        "value": heartbeat_value,
        "rows_returned": len(response.data) if response.data else 0,
    }
