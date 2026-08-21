"""Service layer (ADR-002).

Use-case functions grouped by concern. Depends on ports and settings
only — concrete adapters are resolved via ``composition``.
"""

import io
import logging
from typing import BinaryIO

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404

from . import composition, formatters, jobs, providers
from .models import Segment, Status, Transcription

logger = logging.getLogger(__name__)

FRIENDLY_ERROR = (
    "Transcription failed. The provider may be busy or unavailable — "
    "please try again in a moment."
)
FRIENDLY_RATE_LIMIT = (
    "The transcription service is rate-limited right now. "
    "Please wait a minute and try again."
)


class UploadValidationError(Exception):
    """Raised for client-fixable upload problems (type/size/missing)."""


def validate_upload(file_obj: BinaryIO, filename: str) -> None:
    if not filename:
        raise UploadValidationError("No file was provided.")
    extension = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    if extension not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_UPLOAD_EXTENSIONS)
        raise UploadValidationError(
            f"Unsupported file type {extension or '(none)'}. Allowed: {allowed}."
        )
    size = getattr(file_obj, "size", None)
    if size is None:
        file_obj.seek(0, 2)
        size = file_obj.tell()
        file_obj.seek(0)
    max_bytes = settings.MAX_UPLOAD_BYTES
    if size > max_bytes:
        raise UploadValidationError(
            f"File is too large ({size / 1_000_000:.1f}MB). "
            f"Maximum is {max_bytes // 1_000_000}MB."
        )


def start_transcription(file_data: bytes, filename: str) -> Transcription:
    """Validate the upload, persist a pending row, enqueue the job."""
    transcription = Transcription.objects.create(original_filename=filename)
    jobs.submit(_process_transcription, str(transcription.id), file_data, filename)
    return transcription


def _process_transcription(
    transcription_id: str, file_data: bytes, filename: str
) -> None:
    try:
        Transcription.objects.filter(pk=transcription_id, status=Status.PENDING).update(
            status=Status.PROCESSING
        )
        provider = composition.get_transcription_provider()
        transcript = provider.transcribe(io.BytesIO(file_data), filename)
        _save_success(transcription_id, transcript)
    except providers.RateLimitError as exc:
        _save_failure(transcription_id, FRIENDLY_RATE_LIMIT, exc)
    except providers.UnintelligibleAudioError as exc:
        _save_failure(
            transcription_id,
            "The audio could not be understood. Try a clearer recording.",
            exc,
        )
    except providers.ProviderError as exc:
        _save_failure(transcription_id, FRIENDLY_ERROR, exc)
    except Exception as exc:
        logger.exception("Transcription job %s crashed", transcription_id)
        _save_failure(transcription_id, FRIENDLY_ERROR, exc)


def _save_success(transcription_id: str, transcript: providers.TranscriptData) -> None:
    with transaction.atomic():
        transcription = get_object_or_404(Transcription, pk=transcription_id)
        Segment.objects.bulk_create(
            Segment(
                transcription=transcription,
                text=segment.text,
                start_time=segment.start,
                end_time=segment.end,
            )
            for segment in transcript.segments
        )
        transcription.status = Status.COMPLETED
        transcription.duration = transcript.duration
        transcription.save()


def _save_failure(transcription_id: str, message: str, exc: Exception) -> None:
    logger.warning("Transcription %s failed: %s", transcription_id, exc)
    Transcription.objects.filter(pk=transcription_id).update(
        status=Status.FAILED, error_message=message
    )


def update_segment_text(segment_id: str, new_text: str) -> Segment:
    segment = get_object_or_404(Segment, pk=segment_id)
    segment.text = new_text
    segment.full_clean()
    segment.save()
    return segment


def summarize_transcription(transcription_id: str) -> str:
    """Generate (or regenerate) a summary from current segment text."""
    transcription = get_object_or_404(Transcription, pk=transcription_id)
    if transcription.status != Status.COMPLETED:
        raise NotCompletedError("Transcription is not completed yet.")
    full_text = " ".join(segment.text for segment in transcription.segments.all())
    summary = composition.get_summary_provider().summarize(full_text)
    transcription.summary = summary
    transcription.save()
    return summary


def get_export_content(transcription_id: str, export_format: str) -> tuple[str, str]:
    """Return (content, file_extension) for txt/srt export."""
    if export_format not in ("txt", "srt"):
        raise UnknownFormatError(f"Unknown export format: {export_format!r}")
    transcription = get_object_or_404(Transcription, pk=transcription_id)
    if transcription.status != Status.COMPLETED:
        raise NotCompletedError("Transcription is not completed yet.")
    segments = transcription.segments.all()
    content = (
        formatters.format_srt(segments)
        if export_format == "srt"
        else formatters.format_txt(segments)
    )
    return content, export_format


class NotCompletedError(Exception):
    pass


class UnknownFormatError(Exception):
    pass
