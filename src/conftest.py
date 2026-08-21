import pytest


@pytest.fixture(autouse=True)
def inline_jobs(settings):
    """Run transcription jobs synchronously so tests are deterministic."""
    settings.JOBS_INLINE = True
