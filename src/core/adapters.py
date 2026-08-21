"""Concrete provider adapters (ADR-006).

Each adapter implements a port from ``providers.py``. The ``Fake*``
adapters return deterministic data so dev and tests need no API key.
Adapters are selected by settings (``TRANSCRIPTION_PROVIDER`` /
``SUMMARY_PROVIDER``) in ``composition.py`` — never imported directly
by the service layer.
"""

import io
import logging

from django.conf import settings

from . import providers

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = (".mp3", ".wav", ".mp4", ".m4a")


class FakeTranscriptionAdapter:
    """Deterministic canned transcript; no network, no API key."""

    def transcribe(
        self, file_obj: io.BufferedIOBase, filename: str
    ) -> providers.TranscriptData:
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        return providers.TranscriptData(
            segments=[
                providers.TranscriptSegmentData(
                    start=0.0, end=3.2, text="Hello and welcome to the meeting."
                ),
                providers.TranscriptSegmentData(
                    start=3.2, end=7.5, text=f"This is a fake transcription of {stem}."
                ),
                providers.TranscriptSegmentData(
                    start=7.5, end=11.0, text="Thanks for listening."
                ),
            ],
            duration=11.0,
            text=(
                "Hello and welcome to the meeting. "
                f"This is a fake transcription of {stem}. Thanks for listening."
            ),
        )


class FakeSummaryAdapter:
    def summarize(self, text: str) -> str:
        words = len(text.split())
        return (
            "Summary (fake provider): the transcript contains "
            f"{words} words across its segments and wraps up with a thank-you."
        )


class GroqTranscriptionAdapter:
    """Maps Groq's whisper-large-v3-turbo response onto TranscriptData."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or settings.GROQ_API_KEY

    def transcribe(
        self, file_obj: io.BufferedIOBase, filename: str
    ) -> providers.TranscriptData:
        import groq

        client = groq.Groq(api_key=self._api_key)
        try:
            response = client.audio.transcriptions.create(
                model=settings.GROQ_TRANSCRIPTION_MODEL,
                file=(filename, file_obj),
                response_format="verbose_json",
            )
        except groq.RateLimitError as exc:
            raise providers.RateLimitError(str(exc)) from exc
        except groq.BadRequestError as exc:
            if "could not be understood" in str(exc).lower():
                raise providers.UnintelligibleAudioError(str(exc)) from exc
            raise providers.ProviderError(str(exc)) from exc
        except Exception as exc:
            logger.exception("Groq transcription call failed")
            raise providers.ProviderError(str(exc)) from exc

        raw_segments = getattr(response, "segments", None) or []
        segments = [
            providers.TranscriptSegmentData(
                start=float(segment.get("start", 0.0)),
                end=float(segment.get("end", 0.0)),
                text=str(segment.get("text", "")).strip(),
            )
            for segment in raw_segments
        ]
        duration = getattr(response, "duration", None)
        return providers.TranscriptData(
            segments=segments,
            duration=float(duration) if duration is not None else None,
            text=getattr(response, "text", "") or "",
        )


class GroqSummaryAdapter:
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or settings.GROQ_API_KEY

    def summarize(self, text: str) -> str:
        import groq

        client = groq.Groq(api_key=self._api_key)
        try:
            response = client.chat.completions.create(
                model=settings.GROQ_SUMMARY_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Summarize the following transcript in a short, "
                            "clear paragraph. Reply with the summary only."
                        ),
                    },
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
            )
        except groq.RateLimitError as exc:
            raise providers.RateLimitError(str(exc)) from exc
        except Exception as exc:
            logger.exception("Groq summary call failed")
            raise providers.ProviderError(str(exc)) from exc
        content = response.choices[0].message.content
        return (content or "").strip()
