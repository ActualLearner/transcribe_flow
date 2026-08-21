from django.http import HttpResponse
from rest_framework import status as http_status
from rest_framework.generics import RetrieveAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .formatters import export_filename
from .models import Segment, Transcription
from .providers import ProviderError, RateLimitError
from .serializers import SegmentSerializer, TranscriptionSerializer


class TranscriptionUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded = request.FILES.get("file")
        if uploaded is None:
            return Response(
                {"detail": "No file was provided."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        filename = uploaded.name or ""
        try:
            services.validate_upload(uploaded.file, filename)
        except services.UploadValidationError as exc:
            return Response(
                {"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST
            )

        file_data = uploaded.read()
        transcription = services.start_transcription(file_data, filename)
        return Response(
            {"id": str(transcription.id), "status": transcription.status},
            status=http_status.HTTP_202_ACCEPTED,
        )


class TranscriptionDetailView(RetrieveAPIView):
    serializer_class = TranscriptionSerializer
    queryset = Transcription.objects.all()
    lookup_field = "id"
    lookup_url_kwarg = "id"


class SegmentUpdateView(APIView):
    def patch(self, request, id):
        segment = Segment.objects.filter(pk=id).first()
        if segment is None:
            return Response(
                {"detail": "Not found."}, status=http_status.HTTP_404_NOT_FOUND
            )
        text = request.data.get("text") if isinstance(request.data, dict) else None
        if not isinstance(text, str) or not text.strip():
            return Response(
                {"detail": "Segment text cannot be empty."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        updated = services.update_segment_text(str(segment.id), text)
        return Response(SegmentSerializer(updated).data)


class SummarizeView(APIView):
    def post(self, request, id):
        if not Transcription.objects.filter(pk=id).exists():
            return Response(
                {"detail": "Not found."}, status=http_status.HTTP_404_NOT_FOUND
            )
        try:
            summary = services.summarize_transcription(str(id))
        except services.NotCompletedError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_409_CONFLICT)
        except RateLimitError as exc:
            return Response(
                {"detail": str(exc)}, status=http_status.HTTP_429_TOO_MANY_REQUESTS
            )
        except ProviderError as exc:
            return Response(
                {
                    "detail": (
                        f"The summary provider is unavailable. "
                        f"Please try again shortly. ({exc})"
                    )
                },
                status=http_status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"summary": summary})


class ExportView(APIView):
    CONTENT_TYPES = {"txt": "text/plain", "srt": "application/x-subrip"}

    def get(self, request, id):
        export_format = request.query_params.get("format", "")
        try:
            content, extension = services.get_export_content(str(id), export_format)
        except services.UnknownFormatError as exc:
            return Response(
                {"detail": str(exc)}, status=http_status.HTTP_400_BAD_REQUEST
            )
        except services.NotCompletedError as exc:
            return Response({"detail": str(exc)}, status=http_status.HTTP_409_CONFLICT)

        transcription = Transcription.objects.get(pk=id)
        response = HttpResponse(content, content_type=self.CONTENT_TYPES[extension])
        download_name = export_filename(transcription.original_filename, extension)
        response["Content-Disposition"] = f'attachment; filename="{download_name}"'
        return response
