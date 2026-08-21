from django.urls import path

from . import views

urlpatterns = [
    path(
        "transcriptions/",
        views.TranscriptionUploadView.as_view(),
        name="transcription-upload",
    ),
    path(
        "transcriptions/<uuid:id>/",
        views.TranscriptionDetailView.as_view(),
        name="transcription-detail",
    ),
    path(
        "transcriptions/<uuid:id>/summarize/",
        views.SummarizeView.as_view(),
        name="transcription-summarize",
    ),
    path(
        "transcriptions/<uuid:id>/export/",
        views.ExportView.as_view(),
        name="transcription-export",
    ),
    path(
        "segments/<uuid:id>/", views.SegmentUpdateView.as_view(), name="segment-detail"
    ),
]
