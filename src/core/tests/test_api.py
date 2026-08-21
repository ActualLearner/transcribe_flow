import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from core import providers

pytestmark = pytest.mark.django_db


def upload_file(
    name: str = "meeting.mp3", content: bytes = b"fake-audio-bytes"
) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, content, content_type="audio/mpeg")


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.fixture
def completed_id(client: APIClient) -> str:
    response = client.post(reverse("transcription-upload"), {"file": upload_file()})
    return response.data["id"]


class TestUpload:
    def test_upload_starts_job_and_completes(self, client):
        response = client.post(reverse("transcription-upload"), {"file": upload_file()})

        assert response.status_code == 202
        assert response.data["status"] == "pending"

        detail = client.get(reverse("transcription-detail", args=[response.data["id"]]))
        assert detail.status_code == 200
        assert detail.data["status"] == "completed"
        assert detail.data["original_filename"] == "meeting.mp3"
        assert detail.data["duration"] == 11.0
        assert [segment["text"] for segment in detail.data["segments"]] == [
            "Hello and welcome to the meeting.",
            "This is a fake transcription of meeting.",
            "Thanks for listening.",
        ]
        assert detail.data["error_message"] == ""

    def test_rejects_unsupported_extension(self, client):
        response = client.post(
            reverse("transcription-upload"),
            {"file": upload_file("notes.txt")},
        )
        assert response.status_code == 400
        assert "Unsupported file type" in response.data["detail"]

    def test_rejects_oversized_file(self, client, settings):
        settings.MAX_UPLOAD_BYTES = 1_000_000
        response = client.post(
            reverse("transcription-upload"),
            {"file": upload_file(content=b"x" * 1_000_001)},
        )
        assert response.status_code == 400
        assert "too large" in response.data["detail"]

    def test_rejects_missing_file(self, client):
        response = client.post(reverse("transcription-upload"))
        assert response.status_code == 400

    def test_detail_unknown_id_returns_404(self, client):
        response = client.get(reverse("transcription-detail", args=[uuid.uuid4()]))
        assert response.status_code == 404


class TestProviderFailure:
    def test_rate_limit_surfaces_friendly_error(self, client, monkeypatch):
        def raise_limit(file_obj, filename):
            raise providers.RateLimitError("429 slow down")

        monkeypatch.setattr(
            "core.composition.get_transcription_provider",
            lambda: type("Failing", (), {"transcribe": staticmethod(raise_limit)})(),
        )

        response = client.post(reverse("transcription-upload"), {"file": upload_file()})
        assert response.status_code == 202

        detail = client.get(reverse("transcription-detail", args=[response.data["id"]]))
        assert detail.data["status"] == "failed"
        assert "rate-limited" in detail.data["error_message"]


class TestSegmentEdit:
    def test_edit_persists(self, client, completed_id):
        detail = client.get(reverse("transcription-detail", args=[completed_id]))
        segment = detail.data["segments"][0]

        response = client.patch(
            reverse("segment-detail", args=[segment["id"]]),
            {"text": "Corrected text."},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["text"] == "Corrected text."

        refetched = client.get(reverse("transcription-detail", args=[completed_id]))
        assert refetched.data["segments"][0]["text"] == "Corrected text."

    def test_empty_text_rejected(self, client, completed_id):
        detail = client.get(reverse("transcription-detail", args=[completed_id]))
        segment = detail.data["segments"][0]

        response = client.patch(
            reverse("segment-detail", args=[segment["id"]]),
            {"text": "   "},
            format="json",
        )
        assert response.status_code == 400

    def test_unknown_segment_404(self, client):
        response = client.patch(
            reverse("segment-detail", args=[uuid.uuid4()]),
            {"text": "hi"},
            format="json",
        )
        assert response.status_code == 404


class TestSummarize:
    def test_summary_generated_and_persisted(self, client, completed_id):
        response = client.post(reverse("transcription-summarize", args=[completed_id]))

        assert response.status_code == 200
        assert response.data["summary"].startswith("Summary (fake provider)")

        detail = client.get(reverse("transcription-detail", args=[completed_id]))
        assert detail.data["summary"] == response.data["summary"]

    def test_summary_reflects_edits(self, client, completed_id):
        detail = client.get(reverse("transcription-detail", args=[completed_id]))
        first_segment_id = detail.data["segments"][0]["id"]
        client.patch(
            reverse("segment-detail", args=[first_segment_id]),
            {"text": "zebra"},
            format="json",
        )

        response = client.post(reverse("transcription-summarize", args=[completed_id]))
        assert "zebra" not in response.data["summary"]
        assert response.data["summary"].startswith("Summary (fake provider)")

    def test_not_completed_conflicts(self, client, monkeypatch):
        def never_finishes(file_obj, filename):
            raise providers.ProviderError("boom")

        monkeypatch.setattr(
            "core.composition.get_transcription_provider",
            lambda: type("Failing", (), {"transcribe": staticmethod(never_finishes)})(),
        )
        response = client.post(reverse("transcription-upload"), {"file": upload_file()})
        failed_id = response.data["id"]

        summarize = client.post(reverse("transcription-summarize", args=[failed_id]))
        assert summarize.status_code == 409

    def test_unknown_transcription_404(self, client):
        response = client.post(reverse("transcription-summarize", args=[uuid.uuid4()]))
        assert response.status_code == 404


class TestExport:
    def test_txt_export(self, client, completed_id):
        response = client.get(
            reverse("transcription-export", args=[completed_id]), {"format": "txt"}
        )
        assert response.status_code == 200
        assert response["Content-Type"] == "text/plain"
        assert response["Content-Disposition"] == 'attachment; filename="meeting.txt"'
        lines = response.content.decode().splitlines()
        assert lines[0] == "Hello and welcome to the meeting."
        assert len(lines) == 3

    def test_srt_export_includes_edits(self, client, completed_id):
        detail = client.get(reverse("transcription-detail", args=[completed_id]))
        segment = detail.data["segments"][0]
        client.patch(
            reverse("segment-detail", args=[segment["id"]]),
            {"text": "Fixed cue."},
            format="json",
        )

        response = client.get(
            reverse("transcription-export", args=[completed_id]), {"format": "srt"}
        )
        assert response.status_code == 200
        assert response["Content-Type"] == "application/x-subrip"
        body = response.content.decode()
        assert body.startswith("1\n00:00:00,000 --> 00:00:03,200\nFixed cue.\n")

    def test_unknown_format_400(self, client, completed_id):
        response = client.get(
            reverse("transcription-export", args=[completed_id]), {"format": "vtt"}
        )
        assert response.status_code == 400

    def test_export_before_completion_409(self, client, monkeypatch):
        def fails(file_obj, filename):
            raise providers.ProviderError("boom")

        monkeypatch.setattr(
            "core.composition.get_transcription_provider",
            lambda: type("Failing", (), {"transcribe": staticmethod(fails)})(),
        )
        response = client.post(reverse("transcription-upload"), {"file": upload_file()})
        export = client.get(
            reverse("transcription-export", args=[response.data["id"]]),
            {"format": "txt"},
        )
        assert export.status_code == 409


def test_no_media_written_to_disk(tmp_path):
    """NFR2.1: uploads must never be persisted."""
    from django.test import override_settings

    with override_settings(MEDIA_ROOT=tmp_path):
        client = APIClient()
        client.post(reverse("transcription-upload"), {"file": upload_file()})
    assert list(tmp_path.rglob("*")) == []
    client.post(reverse("transcription-upload"), {"file": upload_file()})
    assert list(tmp_path.rglob("*")) == []
