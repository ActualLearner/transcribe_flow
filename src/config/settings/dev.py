import os

from .base import *  # noqa: F403
from .base import _env_bool

DEBUG = True
ALLOWED_HOSTS = ["*"]

# No manifest storage or WhiteNoise in dev — staticfiles app serves /static/.
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
MIDDLEWARE = [  # noqa: F405
    m
    for m in MIDDLEWARE  # noqa: F405
    if m != "whitenoise.middleware.WhiteNoiseMiddleware"
]

# Dev runs jobs through the real executor to exercise ADR-007 behaviour;
# tests flip JOBS_INLINE via conftest for determinism.
JOBS_INLINE = _env_bool("JOBS_INLINE", "false")

# Local dev defaults to fake providers — no API key required.
if not os.environ.get("TRANSCRIPTION_PROVIDER"):
    TRANSCRIPTION_PROVIDER = "fake"
if not os.environ.get("SUMMARY_PROVIDER"):
    SUMMARY_PROVIDER = "fake"
