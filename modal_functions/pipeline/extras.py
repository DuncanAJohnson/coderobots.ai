"""Optional helpers used by some pipelines but not all.

DocRouter is for the tutor pipeline (runtime selection of doc bundles).
to_danish is a single-call translation helper for the sim pipeline's final stage.
"""

import json
import logging

from .llm import call_gemma

logger = logging.getLogger(__name__)


class DocRouter:
    """Selects which doc bundle(s) apply to a query.

    Bundles are a name -> doc-text map. Descriptions (optional) are a parallel
    name -> one-line summary map shown to the router so it can pick selectively
    instead of just reading bundle keys. The router asks Gemma to emit a JSON
    array of bundle names; unknown names and parse failures fall back to [].
    """

    def __init__(self, bundles: dict[str, str], descriptions: dict[str, str] | None = None):
        self.bundles = bundles
        self.descriptions = descriptions or {}

    async def select(self, query: str) -> list[str]:
        bundle_names = list(self.bundles.keys())
        catalog_lines = [
            f"  - {n}: {self.descriptions.get(n, '(no description)')}" for n in bundle_names
        ]
        example_name = bundle_names[0] if bundle_names else "example"
        # Split into system+user. Gemma 3 12B via SkoleGPT silently emits EOS as
        # its first token when this is sent as a single user message; the
        # split + a small non-zero temperature unsticks generation.
        system_prompt = (
            "You are a documentation router. Pick the bundle(s) whose description "
            "matches the user's query. Be selective: choose the smallest set that "
            "actually covers what they asked. Do NOT include every bundle.\n\n"
            "Output format: a single JSON array of bundle names and nothing else. "
            f'Examples of valid output: ["{example_name}"]   or   '
            f'["{example_name}", "shared"]   or   [].\n\n'
            "Available bundles:\n" + "\n".join(catalog_lines) + "\n\n"
            f"Valid bundle names (use these exact strings): {json.dumps(bundle_names)}."
        )
        user_prompt = (
            f"User query: {query}\n\nRespond with ONLY the JSON array."
        )
        response = await call_gemma(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=200,
            temperature=0.1,
        )
        cleaned = response.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        try:
            selected = json.loads(cleaned.strip())
        except json.JSONDecodeError as e:
            logger.warning("DocRouter: failed to parse %r: %s", cleaned[:100], e)
            return []
        if not isinstance(selected, list):
            return []
        return [n for n in selected if isinstance(n, str) and n in self.bundles]

    def texts_for(self, names: list[str]) -> list[str]:
        return [self.bundles[n] for n in names if n in self.bundles]


async def to_danish(text: str) -> str:
    """Translate text to Danish, preserving fenced code/JSON blocks unchanged."""
    return await call_gemma(
        [
            {
                "role": "system",
                "content": (
                    "You are a translator. Translate the user's text to Danish (Dansk). "
                    "Preserve any code blocks, JSON, or fenced content unchanged. "
                    "Output only the Danish translation, no preamble or explanation."
                ),
            },
            {"role": "user", "content": text},
        ],
        temperature=0.3,
    )
