"""
Model configuration - maps model names to providers and capabilities.
"""

# Model to provider mapping
MODEL_TO_PROVIDER = {
    "gpt-5-nano": "openai",
    "gpt-5-mini": "openai",
    "gpt-5": "openai",
    "skolegpt-v3": "skolegpt",
}

# Models that support streaming
STREAMING_MODELS = {"gpt-5-nano", "skolegpt-v3"}


def get_provider_for_model(model: str) -> str:
    """Get the provider name for a given model."""
    provider = MODEL_TO_PROVIDER.get(model)
    if not provider:
        raise ValueError(f"Unknown model: {model}")
    return provider


def is_streaming_model(model: str) -> bool:
    """Check if a model supports streaming."""
    return model in STREAMING_MODELS


def get_all_models() -> list[str]:
    """Get list of all available models."""
    return list(MODEL_TO_PROVIDER.keys())


def get_models_for_provider(provider: str) -> list[str]:
    """Get all models for a given provider."""
    return [model for model, prov in MODEL_TO_PROVIDER.items() if prov == provider]

