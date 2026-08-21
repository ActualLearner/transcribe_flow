"""Async-lite job execution (ADR-007).

A process-local ``ThreadPoolExecutor`` runs transcription jobs; clients
poll the API for status. No Celery/Redis — a single gunicorn process
shares one executor.

``JOBS_INLINE = True`` (tests) executes jobs synchronously so tests stay
deterministic without asserting on executor internals.
"""

import logging
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

_executor: ThreadPoolExecutor | None = None


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(
            max_workers=settings.JOB_EXECUTOR_MAX_WORKERS,
            thread_name_prefix="transcribe",
        )
    return _executor


def submit(job: Callable[..., Any], *args: Any) -> None:
    """Run a job in the background (or inline when JOBS_INLINE is set)."""
    if settings.JOBS_INLINE:
        job(*args)
        return
    future: Future = _get_executor().submit(job, *args)
    future.add_done_callback(_log_unexpected_failure)


def _log_unexpected_failure(future: Future) -> None:
    error: BaseException | None = future.exception()
    if error is not None:
        logger.error("Background job raised unexpectedly: %s", error, exc_info=error)


def reconcile_orphans() -> int:
    """Mark rows stuck in ``processing``/``pending`` as failed (ADR-004).

    Called on app startup: rows left non-terminal by a crash or restart
    would otherwise poll forever.
    """
    from .models import Status, Transcription

    stuck = Transcription.objects.filter(status__in=[Status.PENDING, Status.PROCESSING])
    count = stuck.update(
        status=Status.FAILED,
        error_message=(
            "Transcription was interrupted by a server restart. Please upload again."
        ),
    )
    if count:
        logger.warning("Reconciled %d orphaned transcription(s) to failed", count)
    return count
