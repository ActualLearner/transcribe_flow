"""
WSGI config for the TranscribeFlow project.

Exposes the WSGI callable as a module-level variable named ``application``.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

application = get_wsgi_application()

# Orphan reconciliation (ADR-004): mark rows stuck non-terminal as failed
# when the server process boots.
try:
    from core import jobs

    jobs.reconcile_orphans()
except Exception:  # pragma: no cover - never block startup
    import logging

    logging.getLogger(__name__).exception("Orphan reconciliation failed")
