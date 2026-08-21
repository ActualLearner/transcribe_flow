"""Provider ports (ADR-002/ADR-003).

The service layer depends only on the protocols and dataclasses defined
here. Concrete adapters (fake, Groq) live in ``adapters.py`` and are
wired in via settings — never imported by services or views.
"""

from dataclasses import dataclass, field
from typing import BinaryIO, Protocol


class ProviderError(Exception):
    """Base class for transcription/summary provider failures."""


class RateLimitError(ProviderError):
    """Provider rejected the request because of rate limiting."""


class UnintelligibleAudioError(ProviderError):
    """Provider could not make sense of the audio."""


@dataclass(frozen=True)
class TranscriptSegmentData:
    start: float
    end: float
    text: str


@dataclass(frozen=True)
class TranscriptData:
    segments: list[TranscriptSegmentData] = field(default_factory=list)
    duration: float | None = None
    text: str = ""


class TranscriptionProvider(Protocol):
    def transcribe(self, file_obj: BinaryIO, filename: str) -> TranscriptData:
        """Transcribe an open media file into structured transcript data."""
        ...


class SummaryProvider(Protocol):
    def summarize(self, text: str) -> str:
        """Summarize a transcript's full text into a short paragraph."""
        ...
