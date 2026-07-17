# API Specification

REST API between the SPA and the backend. Base path: `/api`. JSON request/response unless noted. No authentication (see PRD — anonymous access by unguessable UUID).

## Conventions

- IDs are UUIDs.
- Errors return `{ "detail": "human-readable message" }` (DRF style) with the status codes listed per endpoint.
- `status` is one of: `pending`, `processing`, `completed`, `failed`.

## Transcriptions

### POST /api/transcriptions/

Upload a media file and start a transcription job (ADR-007).

- **Request**: `multipart/form-data`, field `file` (`.mp3`, `.wav`, `.mp4`, `.m4a`, ≤ 25MB).
- **Response `202 Accepted`**:
  ```json
  { "id": "uuid", "status": "pending" }
  ```
- **Errors**: `400` (unsupported type / too large / missing file), `429` (provider rate limit reached).

### GET /api/transcriptions/{id}/

Poll status and fetch the full resource. The SPA polls this (~1.5s) until a terminal status.

- **Response `200 OK`**:
  ```json
  {
    "id": "uuid",
    "status": "completed",
    "original_filename": "meeting.mp3",
    "duration": 182.4,
    "segments": [
      { "id": "uuid", "start_time": 0.0, "end_time": 4.2, "text": "Hello and welcome." }
    ],
    "summary": null,
    "error_message": null,
    "created_at": "2026-07-17T12:00:00Z"
  }
  ```
  While `pending`/`processing`: `segments` is `[]`, `duration`/`summary` are `null`.
  When `failed`: `error_message` is set.
- **Errors**: `404`.

## Segments

### PATCH /api/segments/{id}/

Update the text of one segment (FR3).

- **Request**: `{ "text": "Corrected text" }`
- **Response `200 OK`**: the updated segment object.
- **Errors**: `400` (empty/missing text), `404`.

## Summary

### POST /api/transcriptions/{id}/summarize/

Generate (or regenerate) the AI summary from current segment text. Synchronous — the LLM call completes within the request.

- **Response `200 OK`**: `{ "summary": "..." }`
- **Errors**: `404`, `409` (transcription not `completed`), `429` (provider rate limit), `502` (provider failure).

## Export

### GET /api/transcriptions/{id}/export/?format={txt|srt}

Download the transcript (FR4). Reflects current (edited) segment text.

- **Response `200 OK`**: file attachment.
  - `txt`: `text/plain`, segment texts joined with newlines, no timestamps.
  - `srt`: `application/x-subrip`, numbered cues, `HH:MM:SS,mmm --> HH:MM:SS,mmm`.
  - `Content-Disposition: attachment; filename="<original_stem>.<ext>"`.
- **Errors**: `400` (unknown format), `404`, `409` (not `completed`).

## SPA Serving

All non-`/api`, non-`/admin`, non-`/static` GET routes return the SPA's `index.html` (ADR-009).
