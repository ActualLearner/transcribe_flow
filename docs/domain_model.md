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
- `id`: Unique identifier.
- `status`: (Uploading, Transcribing, Ready, Error).
- `transcript`: A `Transcript` object.
- `summary`: A `Summary` object (optional).

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

- `transcribe_file(file_path)`
- `update_segment_text(transcription_id, segment_id, new_text)`
- `generate_summary(transcription_id)`
- `get_export_data(transcription_id, format)`
