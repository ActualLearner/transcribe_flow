import os

from .base import *  # noqa: F403
from .base import _env_bool

DEBUG = _env_bool("DEBUG", "false")
SECRET_KEY = os.environ["SECRET_KEY"]

# Jobs run through the real executor (ADR-007).
JOBS_INLINE = _env_bool("JOBS_INLINE", "false")

if "DATABASE_URL" in os.environ:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"], conn_max_age=600, ssl_require=True
        )
    }
