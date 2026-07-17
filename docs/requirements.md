# TranscribeFlow — Requirements

> v2 (2026-07-17). Supersedes the v1 draft. The authoritative product definition is [docs/prd.md](./prd.md); this file is the requirements-level summary. Changes from v1: provider is Groq free tier (ADR-006), upload cap is **25MB** (Groq free-tier limit, was 50MB), `.m4a` added, async mechanism fixed as async-lite (ADR-007), stack fixed as Render + Neon + React/TS SPA (ADR-008/009).

## 1. Project Goal

A free, no-signup transcription website: upload audio/video, get a timestamped transcript in seconds, edit it inline, download as `.txt`/`.srt`, and generate an on-demand AI summary — deployed entirely on free-tier infrastructure as a portfolio-grade demonstration of right-sized architecture.

---

## 2. Functional Requirements

### FR1: File Upload

System must accept `.mp3`, `.wav`, `.mp4`, `.m4a` files up to **25MB**.

- AC1: User can select a file via picker **or drag-and-drop**.
- AC2: Client rejects oversized/unsupported files instantly with a clear message; server independently re-validates (400).
- AC3: Upload and processing progress is visible at all times.

### FR2: File Transcription

System must convert speech to timestamped text via the Transcription Provider port (default: Groq `whisper-large-v3-turbo`).

- AC1: Upload returns `202` immediately; transcription runs as a background job (ADR-007).
- AC2: Provider response is mapped to internal `Transcript`/`Segment` model (text + start/end per segment, total duration).
- AC3: Provider rate limits surface to the user as a friendly retry message (429).

### FR3: Interactive Editor

System must allow viewing/editing of the transcript.

- AC1: User can edit the text of any segment inline.
- AC2: Confirming an edit (blur/Enter/Save) persists it server-side with visible saving/saved feedback.
- AC3: After refresh, edited text — not the original — is shown.

### FR4: Download Transcription

- AC1: Download as `.txt` (plain text, no timestamps).
- AC2: Download as `.srt` (numbered cues, `HH:MM:SS,mmm --> HH:MM:SS,mmm`).
- AC3: Exports always reflect current (edited) segment text.

### FR5: AI Summary

- AC1: Summary is generated only on explicit "Summarize" click (default: Groq `llama-3.3-70b-versatile`).
- AC2: The current (possibly edited) transcript text is what gets summarized.
- AC3: Summary is displayed read-only and persists across refreshes.

---

## 3. Non-Functional Requirements

### NFR1: Performance
- NFR1.1: UI remains responsive during upload and processing.
- NFR1.2: Processing is non-blocking (202 + polling; no request held open for the job).

### NFR2: Security & Privacy
- NFR2.1: Uploaded media is discarded immediately after the provider call — never persisted. Transcript text persists in the DB.
- NFR2.2: File type & size validated client-side **and** server-side.
- NFR2.3: All secrets via environment variables; none in the repo.

### NFR3: Reliability
- NFR3.1: A page refresh restores the current transcription (id in `localStorage`, state from the API).
- NFR3.2: A process restart can never strand a job: rows left `processing` are reconciled to `failed` on startup.

### NFR4: Usability
- NFR4.1: Live status updates (pending → processing → completed/failed) without manual refresh.

### NFR5: Cost
- NFR5.1: $0 infrastructure — every service on a genuinely free tier (ADR-006/008).
- NFR5.2: LLM calls are explicit and user-triggered only; no automatic summarization.

### NFR6: Observability
- NFR6.1: Every failure mode has a distinct, human-readable error state in the UI.
- NFR6.2: Provider failures are recorded (`error_message`) and logged server-side.

### NFR7: Engineering Quality (portfolio)
- NFR7.1: Hexagonal architecture with provider ports; fake adapters make dev/test fully offline.
- NFR7.2: CI runs lint, type checks, backend + frontend tests on every PR; green required to merge.
- NFR7.3: TDD for service-layer and API behaviour.

---

## 4. Out of Scope

- Accounts/auth; per-user history.
- Files > 25MB; chunked transcription of long media; server-side transcoding.
- Live microphone recording.
- WebSockets/SSE (polling suffices).
- Payments/quotas; translation; speaker diarization; word-level timestamps.
