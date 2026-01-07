# API Specification

This document outlines the internal API between the frontend and the backend modules.

## Transcription Module

### POST /api/transcribe

- **Description**: Upload a file for transcription.
- **Request**: Multipart form-data (file: .mp3, .mp4, .wav).
- **Response**:
  - `202 Accepted`
  - Body: `{ "task_id": "uuid", "status": "processing" }`

### GET /api/transcribe/{task_id}

- **Description**: Check the status of a transcription task.
- **Response**:
  - `200 OK`
  - Body: `{ "status": "completed", "transcript": { "segments": [...] } }`
  - Body (Error): `{ "status": "failed", "error": "Reason" }`

## Editor Module

### PUT /api/transcribe/{transcription_id}/segments/{segment_id}

- **Description**: Update the text of a specific segment.
- **Request**: `{ "text": "New text" }`
- **Response**: `200 OK`

## Summary Module

### POST /api/transcribe/{transcription_id}/summarize

- **Description**: Generate an AI summary.
- **Response**:
  - `200 OK`
  - Body: `{ "summary": "..." }`

## Export Module

### GET /api/transcribe/{transcription_id}/export?format={txt|srt}

- **Description**: Download the transcript in the requested format.
- **Response**: File download.
