import pytest

from core import formatters
from core.models import Segment


class TestFormatTxt:
    def test_joins_segment_texts_with_newlines(self):
        segments = [
            Segment(text="First line.", start_time=0, end_time=1),
            Segment(text="Second line.", start_time=1, end_time=2),
        ]
        assert formatters.format_txt(segments) == "First line.\nSecond line."

    def test_empty_transcript(self):
        assert formatters.format_txt([]) == ""


class TestSrtTimestamp:
    @pytest.mark.parametrize(
        ("seconds", "expected"),
        [
            (0.0, "00:00:00,000"),
            (3.2, "00:00:03,200"),
            (59.9995, "00:01:00,000"),  # rounds to the next second
            (3661.5, "01:01:01,500"),
            (86_400.0, "24:00:00,000"),
        ],
    )
    def test_timestamp_formatting(self, seconds, expected):
        assert formatters._srt_timestamp(seconds) == expected

    def test_negative_clamps_to_zero(self):
        assert formatters._srt_timestamp(-1.0) == "00:00:00,000"


class TestFormatSrt:
    def test_numbered_cues_with_timestamps(self):
        segments = [
            Segment(text="Hello.", start_time=0.0, end_time=2.0),
            Segment(text="World.", start_time=2.0, end_time=4.25),
        ]
        result = formatters.format_srt(segments)
        assert (
            result == "1\n00:00:00,000 --> 00:00:02,000\nHello.\n\n"
            "2\n00:00:02,000 --> 00:00:04,250\nWorld.\n"
        )

    def test_empty_transcript(self):
        assert formatters.format_srt([]) == ""


class TestExportFilename:
    def test_strips_extension(self):
        assert formatters.export_filename("meeting.mp3", "txt") == "meeting.txt"

    def test_sanitises_unsafe_characters(self):
        assert (
            formatters.export_filename("../../evil file!.mp4", "srt") == "evil file.srt"
        )

    def test_falls_back_when_no_usable_name(self):
        assert formatters.export_filename("...mp3", "txt") == "transcript.txt"
