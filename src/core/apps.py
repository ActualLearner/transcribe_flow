import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self) -> None:
        # Orphan reconciliation (ADR-004/ADR-007) runs once per real
        # server start: `RUN_MAIN` under runserver, wsgi.py under
        # gunicorn. Not during management commands/tests.
        import os

        if os.environ.get("RUN_MAIN") == "true":
            self._reconcile()

    @staticmethod
    def _reconcile() -> None:
        from django.db.utils import OperationalError, ProgrammingError

        from . import jobs

        try:
            jobs.reconcile_orphans()
        except (OperationalError, ProgrammingError):
            logger.debug("Skipping orphan reconciliation before migrations")
