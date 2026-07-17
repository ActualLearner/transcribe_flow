# TranscribeFlow — Product Requirements Document

Status: Approved
Date: 2026-07-17
Supersedes: `docs/requirements.md` (v1 draft)

---

## Problem Statement

People regularly need text versions of audio and video — lecture recordings, meeting audio, podcast clips, interview footage. Existing tools either cost money, bury the feature behind sign-ups, or hand back a wall of unedited text with no timestamps. Users want to upload a file, get an accurate timestamped transcript quickly, fix the inevitable transcription mistakes themselves, and walk away with a clean `.txt` or `.srt` file — without creating an account or paying.

## Solution

TranscribeFlow is a free, no-signup web app: drag in an audio/video file (≤25MB), watch live status while it transcribes, edit any segment inline, download as plain text or SRT subtitles, and optionally generate a one-click AI summary. Uploaded media is never stored — it is streamed to the transcription provider and discarded, so privacy is a feature, not a promise.

It is also a portfolio piece: it must demonstrate production-grade engineering (hexagonal architecture, provider abstraction, async UX, typed frontend, CI, tests) while running entirely on free-tier infrastructure.

## User Stories

1. As a visitor, I want to upload an `.mp3`, `.wav`, `.mp4`, or `.m4a` file via a file picker or drag-and-drop, so that I can transcribe it without reading instructions.
2. As a visitor, I want files over 25MB or of unsupported types rejected instantly in the browser with a clear message, so that I don't wait through a doomed upload.
3. As a visitor, I want the server to also validate type and size, so that the app can't be broken by bypassing the UI.
4. As a visitor, I want to see an upload progress indicator, so that I know the file is transferring.
5. As a visitor, I want the app to show a live status ("uploading → transcribing → ready") that updates without me refreshing, so that I trust it's working.
6. As a visitor, I want transcription of a typical file to complete in seconds, so that the tool feels instant compared to alternatives.
7. As a visitor, I want the finished transcript displayed as a list of timestamped segments, so that I can see exactly when each phrase was spoken.
8. As an editor, I want to click any segment and edit its text inline, so that I can fix transcription errors.
9. As an editor, I want my segment edit saved when I confirm it (blur/Enter/Save), with visible saved/saving feedback, so that I never lose corrections.
10. As an editor, I want edits persisted server-side, so that a page refresh shows my corrected text, not the original.
11. As a visitor, I want to refresh the page mid-transcription and have the app restore my in-progress or finished transcription, so that an accidental refresh costs nothing.
12. As a visitor, I want to download the transcript as `.txt` (plain text, no timestamps), so that I can paste it into documents.
13. As a visitor, I want to download the transcript as `.srt` (numbered cues with `HH:MM:SS,mmm` timestamps), so that I can use it as subtitles.
14. As a visitor, I want downloads to include my edits, so that the exported file reflects the corrected transcript.
15. As a visitor, I want a "Summarize" button that generates an AI summary of the (possibly edited) transcript, so that I can get the gist without reading everything.
16. As a visitor, I want the summary to appear in a read-only panel and persist across refreshes, so that I can come back to it.
17. As a cost-conscious operator, I want summaries generated only on explicit click (never automatically), so that free-tier LLM quota isn't wasted.
18. As a visitor, I want a clear, human-readable error state if transcription or summarization fails (provider down, rate-limited, unintelligible audio), so that I know whether to retry.
19. As a privacy-conscious visitor, I want my media file discarded immediately after transcription, so that my recordings never sit on a server.
20. As a visitor on a slow connection, I want the UI to stay responsive during upload and processing, so that the app never appears frozen.
21. As a recruiter/reviewer, I want the live demo linked from the README to work on first visit (allowing for free-tier cold start), so that I can evaluate the project in one click.
22. As a developer, I want to run the whole app locally with a fake transcription provider and no API keys, so that development and tests need zero external dependencies.
23. As a developer, I want CI to run linting, type checks, backend tests, and frontend tests on every PR, so that regressions are caught before merge.

## Implementation Decisions

### Product constraints (verified against provider docs, 2026-07)

- **Max upload: 25MB** — hard limit of Groq's free-tier speech-to-text endpoint. Enforced client-side and server-side.
- **Accepted formats:** `.mp3`, `.wav`, `.mp4`, `.m4a` (all natively accepted by Groq's Whisper endpoint; no server-side transcoding — free-tier CPU can't afford ffmpeg).
- **Anonymous access; no accounts.** A transcription is reachable by anyone holding its UUID URL (unguessable, not listed). Documented as a deliberate scope decision.
- **Retention:** media discarded immediately after provider call; transcript text/segments/summary persist in the database indefinitely (0.5GB free Postgres is ample).

### Architecture

- **Modular monolith, hexagonal (ports & adapters)** — per existing ADR-001/002. Django apps stay as one `core` app initially; modules are expressed as service-layer functions grouped by use case (transcription, editing, export, summary).
- **Backend:** Django 6 + Django REST Framework. Settings split (base/dev/prod) already exists and is kept.
- **Provider ports:**
  - `TranscriptionProvider` protocol: `transcribe(file, filename) -> TranscriptData` (segments with start/end/text, duration, full text).
  - `SummaryProvider` protocol: `summarize(text) -> str`.
  - Concrete adapters: `GroqTranscriptionAdapter` (model `whisper-large-v3-turbo`), `GroqSummaryAdapter` (model `llama-3.3-70b-versatile`), plus `FakeTranscriptionAdapter` / `FakeSummaryAdapter` returning deterministic canned data for dev/tests.
  - Adapter selection via settings/env (`TRANSCRIPTION_PROVIDER=groq|fake`), injected into the service layer — no service-layer imports of concrete adapters.
- **Async-lite processing (revises ADR-005):** upload endpoint validates, creates a `Transcription` row (`pending`), submits a job to a process-local `ThreadPoolExecutor`, and returns `202` with the transcription id. The worker sets `processing`, calls the provider, bulk-creates segments, sets `completed` or `failed` + error message. Client polls the detail endpoint. No Celery, no Redis — free tier can't host them, and Groq jobs finish in seconds. On app startup, any row stuck in `processing` is marked `failed` (orphan reconciliation — satisfies state-restoration ADR-004).
- **No file persistence:** the `Transcription.file` FileField is removed. Upload is held in memory/temp only for the duration of the provider call. Store `original_filename` for display.
- **Model changes:** `Transcription` gains `original_filename`, `error_message`; keeps `status`, `duration`, `summary`, timestamps. `Segment` unchanged (FK, text, start_time, end_time). Existing migration is replaced (no deployed environments yet).

### API contract

Base path `/api`. JSON everywhere except upload (multipart) and export (file response).

| Method & path | Purpose | Success | Errors |
|---|---|---|---|
| `POST /api/transcriptions/` | multipart upload, starts job | `202 {id, status}` | `400` invalid type/size, `429` provider rate limit |
| `GET /api/transcriptions/{id}/` | poll status + full resource | `200 {id, status, original_filename, duration, segments: [{id, start_time, end_time, text}], summary, error_message}` | `404` |
| `PATCH /api/segments/{id}/` | edit segment text | `200 {id, ..., text}` | `400`, `404` |
| `POST /api/transcriptions/{id}/summarize/` | generate summary (synchronous; LLM call is fast) | `200 {summary}` | `404`, `409` if not completed, `502` provider failure |
| `GET /api/transcriptions/{id}/export/?format=txt\|srt` | download | `200` file attachment | `400` bad format, `404`, `409` if not completed |

### Frontend

- **React + TypeScript + Vite** in `frontend/`, single-page app.
- Production: `vite build` output collected by Django/WhiteNoise and served from the same origin (no CORS, single deploy). Dev: Vite dev server proxying `/api` to Django.
- State restoration: transcription id stored in `localStorage`; on load, if present, fetch and restore (NFR3.1).
- Polling: fetch detail endpoint every ~1.5s while status is `pending`/`processing`; stop on `completed`/`failed`.
- Styling: Tailwind CSS. Clean, minimal, portfolio-quality UI with proper loading/empty/error states.

### Persistence & deployment

- **DB:** SQLite in dev; Postgres via `DATABASE_URL` (Neon free plan) in prod, using `dj-database-url` + `psycopg[binary]`.
- **Hosting:** Render free web service. `render.yaml` blueprint: build installs Python deps, builds frontend, runs `collectstatic`; start runs `migrate` then `gunicorn` with a threaded worker class (threads share the executor; single process fits 512MB).
- **Config:** all secrets via env (`GROQ_API_KEY`, `DATABASE_URL`, `SECRET_KEY`, `DJANGO_SETTINGS_MODULE`). `.env` for local, Render dashboard for prod. `.env.example` documents every variable.
- **Free-tier caveats accepted:** cold start after 15min idle (~30–60s; README warns demo viewers), Groq free-tier rate limits (7,200 audio-sec/hr, 20 req/min — surfaced to users as a friendly 429 message).

### Seams (where behaviour is tested)

1. **Primary seam — the HTTP API** with fake providers injected: every use case is exercised end-to-end through DRF (upload→poll→edit→export→summarize) without any network. This is the highest existing seam and covers the service layer implicitly.
2. **Provider adapter seam:** adapter unit tests map recorded Groq response fixtures → internal `TranscriptData`; no live calls in CI.
3. **Pure domain functions:** SRT/TXT formatting tested directly (timestamp math, cue numbering, edge cases).

## Testing Decisions

- Good tests assert **external behaviour through the seams above**, never internals (no asserting "executor.submit was called"; instead run the executor eagerly/synchronously in tests and assert the resulting API-visible state).
- **Backend:** `pytest` + `pytest-django`. TDD workflow for all service/API work. Fixtures provide fake providers; a settings override runs background jobs inline so tests are deterministic.
- **Frontend:** `vitest` + React Testing Library + MSW for API mocking. `@total-typescript/shoehorn` (`fromPartial`) for partial test data instead of `as` casts.
- **CI (GitHub Actions):** ruff (lint+format check), pytest, `tsc --noEmit`, vitest, `vite build` — all green required to merge.
- No live-provider tests in CI; an optional manually-run smoke script hits Groq with a tiny fixture audio for local verification.

## Out of Scope

- Accounts, authentication, per-user history.
- Files > 25MB; chunked/segmented transcription of long media.
- Live microphone recording.
- Server-side media transcoding (ffmpeg).
- WebSockets/SSE (polling is sufficient at this scale).
- Payments, quotas, multi-tenancy.
- Translation, speaker diarization, word-level timestamps.
- Mobile apps.

## Further Notes

- The provider abstraction means a paid OpenAI adapter is a ~50-line addition later — this is the vendor-lock-in escape hatch (ADR-003) and a good README talking point.
- The async-lite design is a deliberate, documented right-sizing for free-tier constraints (see ADR-007); the README should present the trade-off analysis — it demonstrates architectural judgment, which is the point of a portfolio.
- Groq free tier requires no credit card; the operator (repo owner) creates one API key and sets it in Render.
