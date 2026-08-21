"""Composition root.

The only module allowed to import concrete adapters. Services receive
providers through these accessors so the selection stays a settings
concern (ADR-002/ADR-006).
"""

from django.conf import settings

from . import adapters
from .providers import SummaryProvider, TranscriptionProvider


def get_transcription_provider() -> TranscriptionProvider:
    match settings.TRANSCRIPTION_PROVIDER:
        case "groq":
            return adapters.GroqTranscriptionAdapter()
        case "fake":
            return adapters.FakeTranscriptionAdapter()
        case other:
            raise ValueError(f"Unknown TRANSCRIPTION_PROVIDER: {other!r}")


def get_summary_provider() -> SummaryProvider:
    match settings.SUMMARY_PROVIDER:
        case "groq":
            return adapters.GroqSummaryAdapter()
        case "fake":
            return adapters.FakeSummaryAdapter()
        case other:
            raise ValueError(f"Unknown SUMMARY_PROVIDER: {other!r}")
