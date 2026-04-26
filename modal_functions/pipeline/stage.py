"""Stage base class and shared Scratch state for pipelines."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Scratch:
    """Shared state passed through a pipeline.

    Stages read history/artifacts and write their output to artifacts[name].
    history holds the conversation as a list of {role, content} dicts.
    meta is a free-form bag for token counts, timings, retrieved doc names, etc.
    """

    history: list[dict] = field(default_factory=list)
    artifacts: dict[str, Any] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)


class Stage:
    """Base class for a single LLM step.

    Subclasses set `name` and override `build_messages`. They may override `parse`
    to post-process the model's text response before it is stored in scratch.

    `output_budget` is passed to the LLM as max_tokens. `input_budget` is advisory —
    stages can use it inside `build_messages` to trim history (see budget.fit).

    Stages that need conditional execution or that mutate scratch.history (e.g. a
    summarization stage) override `run()` instead of `build_messages` / `parse`.
    """

    name: str = "stage"
    output_budget: int = 1000
    input_budget: int = 8000

    def build_messages(self, scratch: Scratch) -> list[dict]:
        raise NotImplementedError(f"{self.__class__.__name__}.build_messages")

    def parse(self, response: str) -> Any:
        return response

    async def run(self, scratch: Scratch) -> None:
        """Default flow: build_messages → call_gemma → parse → store under self.name."""
        from .llm import call_gemma

        messages = self.build_messages(scratch)
        response = await call_gemma(messages, max_tokens=self.output_budget)
        scratch.artifacts[self.name] = self.parse(response)

    def progress_payload(self, scratch: Scratch) -> dict:
        """Optional chain-of-thought payload attached to the SSE progress event.

        Defaults to empty. Override to surface stage-specific reasoning to the
        client (selected docs, outline preview, summarised history note, etc).
        Keep payloads small — they travel on the wire each transition.
        """
        return {}
