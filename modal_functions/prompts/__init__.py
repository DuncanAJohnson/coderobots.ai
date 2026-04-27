"""Server-side hardware doc bundles for the tutor pipeline.

Each hardware mode contributes:
- PREAMBLE: role + format header (always included in system prompts)
- BUNDLES: dict[name, text] of API doc bundles (router-selectable)
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

EXAMPLES: dict[str, str] = {
    "spike": spike.EXAMPLES,
    "microbit": microbit.EXAMPLES,
    "lego": lego_education.EXAMPLES,
    "esp32": esp32.EXAMPLES,
}

__all__ = ["PREAMBLES", "BUNDLES", "EXAMPLES", "LEVEL_PROMPTS"]
