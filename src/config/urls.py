"""URL configuration for the TranscribeFlow project."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as static_serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
]

# SPA fallback (ADR-009): every non-API/admin/static route serves index.html.
# In prod, WhiteNoise serves /static/ assets before this fallback applies.
urlpatterns += [
    re_path(
        r"^(?!api/|admin/|static/).*$",
        static_serve,
        {"document_root": settings.SPA_DIST_DIR, "path": "index.html"},
    ),
]
