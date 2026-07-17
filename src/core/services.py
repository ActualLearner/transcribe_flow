from django.db import transaction
from django.shortcuts import get_object_or_404
from .models import Transcription, Segment, Status


def create_transcription(file_obj):
    transcription = Transcription.objects.create(file=file_obj)
    return str(transcription.id)


@transaction.atomic
def save_transcription(transcription_id, whisper_data):
    transcription = get_object_or_404(Transcription, id=transcription_id)
    transaction.duration = whisper_data.get("duration")
    transaction.text = whisper_data.get("text")

    segment_objects = []

    for s in whisper_data.segments:
        segment = Segment(
            transaction=transaction,
            text=s["text"],
            start_time=s["start"],
            end_time=s["end"],
        )
        segment_objects.append(segment)

    Segment.objects.bulk_create(segment_objects)

    transcription.status = Status.COMPLETED
    transaction.save()


def update_segment(segment_id, new_text):
    segment = get_object_or_404(Segment, id=segment_id)
    segment.text = new_text
    segment.save()
    return segment
