"""Server-side hardware doc bundles for the tutor pipeline.

Each hardware mode contributes:
- PREAMBLE: role + format header (always included in system prompts)
- BUNDLES: dict[name, text] of API doc bundles (router-selectable)
- BUNDLE_DESCRIPTIONS: dict[name, one-line summary] used by the doc router
- DEFAULT_BUNDLES: list[name] used as the fallback when the router returns nothing
- EXAMPLES: code examples (always included; may be empty)

Hardware mode keys: 'spike' | 'microbit' | 'lego' | 'esp32'.
"""

from . import esp32, lego_education, microbit, spike
from .levels import LEVEL_PROMPTS

PREAMBLES: dict[str, str] = {
    "spike": spike.PREAMBLE,
    "microbit": microbit.PREAMBLE,
    "lego": lego_education.PREAMBLE,
    "esp32": esp32.PREAMBLE,
}

BUNDLES: dict[str, dict[str, str]] = {
    "spike": spike.BUNDLES,
    "microbit": microbit.BUNDLES,
    "lego": lego_education.BUNDLES,
    "esp32": esp32.BUNDLES,
}

BUNDLE_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "spike": spike.BUNDLE_DESCRIPTIONS,
    "microbit": microbit.BUNDLE_DESCRIPTIONS,
    "lego": lego_education.BUNDLE_DESCRIPTIONS,
    "esp32": esp32.BUNDLE_DESCRIPTIONS,
}

DEFAULT_BUNDLES: dict[str, list[str]] = {
    "spike": spike.DEFAULT_BUNDLES,
    "microbit": microbit.DEFAULT_BUNDLES,
    "lego": lego_education.DEFAULT_BUNDLES,
    "esp32": esp32.DEFAULT_BUNDLES,
}

EXAMPLES: dict[str, str] = {
    "spike": spike.EXAMPLES,
    "microbit": microbit.EXAMPLES,
    "lego": lego_education.EXAMPLES,
    "esp32": esp32.EXAMPLES,
}

__all__ = [
    "PREAMBLES",
    "BUNDLES",
    "BUNDLE_DESCRIPTIONS",
    "DEFAULT_BUNDLES",
    "EXAMPLES",
    "LEVEL_PROMPTS",
]
