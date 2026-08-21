from rest_framework import serializers

from .models import Segment, Transcription


class SegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segment
        fields = ["id", "start_time", "end_time", "text"]
        read_only_fields = ["id", "start_time", "end_time"]

    def validate_text(self, value: str) -> str:
        if not (value or "").strip():
            raise serializers.ValidationError("Segment text cannot be empty.")
        return value


class TranscriptionSerializer(serializers.ModelSerializer):
    segments = SegmentSerializer(many=True, read_only=True)

    class Meta:
        model = Transcription
        fields = [
            "id",
            "status",
            "original_filename",
            "duration",
            "segments",
            "summary",
            "error_message",
            "created_at",
        ]
