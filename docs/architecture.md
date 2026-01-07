# Architecture Overview

This document describes the high-level architecture of TranscribeFlow, following the principles from _Fundamentals of Software Architecture_.

## Architectural Characteristics (Ilities)

Based on the requirements, we prioritize the following characteristics:

1. **Usability (NFR4.1)**: The system must provide real-time feedback.
2. **Reliability (NFR3.1)**: State must be restorable after a refresh.
3. **Responsiveness (NFR1.1)**: UI must not block during heavy processing.
4. **Maintainability**: The modular monolith structure ensures we can evolve the system easily.
5. **Security (NFR2.1)**: Short-lived file storage to ensure user privacy.

## Architectural Style: Modular Monolith

TranscribeFlow is designed as a **Modular Monolith**. This style provides the simplicity of a single deployment unit while enforcing logical separation between different domain concerns.

### Logical Layers (Hexagonal Architecture)

Within each module, we follow the **Hexagonal (Ports and Adapters)** pattern as described in _Cosmic Python_:

- **Domain Model**: Pure business logic (transcription segments, editing rules).
- **Service Layer (Use Cases)**: Coordinates tasks and defines the "API" of the domain.
- **Entrypoints (Adapters)**: HTTP API, CLI, or GUI.
- **Infrastructure (Adapters)**: Implementations for external services (Transcription providers, LLMs, Storage).

## Module Decomposition

1. **Transcription Module**: Handles file upload, interaction with AI transcription providers, and segment management.
2. **Editor Module**: Manages the editing state and saves changes.
3. **Export Module**: Formats transcription data into `.txt` and `.srt`.
4. **Summary Module**: Interacts with LLMs to generate summaries.

## Data Flow

1. User uploads file via **Transcription Module**.
2. **Transcription Module** calls external provider and returns segments.
3. User edits segments via **Editor Module**.
4. User requests summary via **Summary Module**.
5. User downloads file via **Export Module**.

## System Context Diagram

```mermaid
graph LR
    User((User))
    TF[TranscribeFlow]
    TP[Transcription Provider\n(e.g. OpenAI Whisper)]
    LLM[LLM Provider\n(e.g. GPT-4)]

    User --> TF
    TF --> TP
    TF --> LLM
```
