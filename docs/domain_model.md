# Domain Model

This document outlines the core domain concepts of TranscribeFlow, following the Domain-Driven Design (DDD) approach described in *Cosmic Python*.

## Ubiquitous Language

- **Transcription**: The overall entity representing a processed audio/video file.
- **Segment**: A piece of transcribed text associated with a specific start and end time.
- **Transcript**: The collection of all segments for a given Transcription.
- **Summary**: An AI-generated condensed version of the Transcript.
- **Provider**: An external service (e.g., OpenAI) that performs transcription or summarization.

## Entities and Value Objects

### Transcription (Aggregate Root)
- `id`: Unique identifier (UUID).
- `status`: (`pending`, `processing`, `completed`, `failed`).
- `original_filename`: Display name of the uploaded file (the file itself is never persisted — NFR2.1).
- `duration`: Media length in seconds (set on completion).
- `transcript`: A `Transcript` (the segment collection).
- `summary`: AI summary text (optional; set on demand).
- `error_message`: Human-readable failure reason (set only when `failed`).

### Segment (Value Object / Entity)
- `id`: Unique identifier.
- `start_time`: Timestamp (seconds).
- `end_time`: Timestamp (seconds).
- `text`: The transcribed text.

### Transcript (Value Object)
- `segments`: List of `Segment`.

## Core Logic (Domain Services)

- **Transcription Processor**: Logic to convert raw provider output into our internal `Transcript` model.
- **Subtitle Formatter**: Logic to convert `Transcript` into SRT format.

## Repository Pattern

Although NFR2.1 states files should be discarded, we need a way to store the *state* of the transcription (text and timestamps) for editing.

- `TranscriptionRepository`: Interface for storing and retrieving `Transcription` aggregates.

## Service Layer (Use Cases)

- `start_transcription(file, filename)` → creates the aggregate (`pending`) and schedules the job.
- `run_transcription_job(transcription_id, file_bytes, filename)` → calls the `TranscriptionProvider` port, persists segments, transitions status.
- `update_segment_text(segment_id, new_text)`
- `generate_summary(transcription_id)` → calls the `SummaryProvider` port with current (edited) transcript text.
- `get_export_data(transcription_id, format)` → `txt` | `srt` via the Subtitle Formatter.

## Provider Ports (ADR-003, ADR-006)

- `TranscriptionProvider.transcribe(file, filename) -> TranscriptData`
- `SummaryProvider.summarize(text) -> str`

Concrete adapters: Groq (production), Fake (dev/tests). Adapters map provider responses to `TranscriptData`; no provider types leak past the port.
