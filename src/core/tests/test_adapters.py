"""Adapter seam: recorded Groq response fixtures map onto TranscriptData.

No live calls — the Groq SDK client is faked at its boundary.
"""

import io
from types import SimpleNamespace

import pytest

import core.adapters as adapters
from core import providers


class FakeGroqAudio:
    def __init__(self, response, error=None):
        self._response = response
        self._error = error

    def create(self, **kwargs):
        if self._error is not None:
            raise self._error
        return self._response


def make_groq_client(monkeypatch, audio):
    client = SimpleNamespace(audio=SimpleNamespace(transcriptions=audio))
    monkeypatch.setattr("groq.Groq", lambda api_key: client)


def verbose_json_fixture():
    return SimpleNamespace(
        text="Hello and welcome.",
        duration=3.2,
        segments=[
            {"start": 0.0, "end": 3.2, "text": " Hello and welcome."},
        ],
    )


class TestGroqTranscriptionMapping:
    def test_maps_segments_duration_and_text(self, monkeypatch, settings):
        settings.GROQ_API_KEY = "test-key"
        make_groq_client(monkeypatch, FakeGroqAudio(verbose_json_fixture()))

        transcript = adapters.GroqTranscriptionAdapter().transcribe(
            io.BytesIO(b"audio"), "clip.mp3"
        )

        assert transcript.text == "Hello and welcome."
        assert transcript.duration == 3.2
        assert transcript.segments == [
            providers.TranscriptSegmentData(
                start=0.0, end=3.2, text="Hello and welcome."
            )
        ]

    def test_rate_limit_error_is_translated(self, monkeypatch, settings):
        import groq

        settings.GROQ_API_KEY = "test-key"
        error = groq.RateLimitError(
            "429",
            response=SimpleNamespace(request=None, status_code=429, headers={}),
            body=None,
        )
        make_groq_client(monkeypatch, FakeGroqAudio(None, error=error))

        with pytest.raises(providers.RateLimitError):
            adapters.GroqTranscriptionAdapter().transcribe(
                io.BytesIO(b"audio"), "clip.mp3"
            )


class TestFakeAdapters:
    def test_fake_transcription_is_deterministic(self):
        first = adapters.FakeTranscriptionAdapter().transcribe(None, "meeting.mp3")
        second = adapters.FakeTranscriptionAdapter().transcribe(None, "meeting.mp3")
        assert first == second
        assert all(segment.text for segment in first.segments)

    def test_fake_summary_mentions_word_count(self):
        summary = adapters.FakeSummaryAdapter().summarize("one two three")
        assert "3" in summary
