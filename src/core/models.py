import uuid

from django.db import models

# Create your models here.


class Status(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class Transcription(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(
        choices=Status.choices,
        default=Status.PENDING,
        max_length=10,
    )
    file = models.FileField(upload_to="uploads/$Y/$m/$d")
    duration = models.FloatField(null=True)
    summary = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def text(self):
        if not self.segments.exists():
            return ""
        return " ".join([s.text for s in self.segments.all()])

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.id} ({self.status})"


class Segment(models.Model):
    transcription = models.ForeignKey(
        Transcription, on_delete=models.CASCADE, related_name="segments"
    )
    text = models.TextField()
    start_time = models.FloatField()
    end_time = models.FloatField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.start_time}-{self.end_time}: {self.text[:20]}..."
