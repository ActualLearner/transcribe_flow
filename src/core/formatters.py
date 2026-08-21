"""Pure transcript formatting — no Django, trivially testable."""

from collections.abc import Sequence


def format_txt(segments: Sequence) -> str:
    """Plain text: segment texts joined with newlines, no timestamps."""
    return "\n".join(segment.text for segment in segments)


def _srt_timestamp(seconds: float) -> str:
    if seconds < 0:
        seconds = 0.0
    total_ms = round(seconds * 1000)
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_srt(segments: Sequence) -> str:
    """Numbered cues with ``HH:MM:SS,mmm --> HH:MM:SS,mmm`` timestamps."""
    cues = []
    for number, segment in enumerate(segments, start=1):
        timing = (
            f"{_srt_timestamp(segment.start_time)} --> "
            f"{_srt_timestamp(segment.end_time)}"
        )
        cues.append(f"{number}\n{timing}\n{segment.text}\n")
    return "\n".join(cues)


def export_filename(original_filename: str, extension: str) -> str:
    """Derive a safe download name from the uploaded filename."""
    stem = (
        original_filename.rsplit(".", 1)[0]
        if "." in original_filename
        else original_filename
    )
    safe_stem = (
        "".join(char for char in stem if char.isalnum() or char in "-_ ").strip()
        or "transcript"
    )
    return f"{safe_stem}.{extension}"
