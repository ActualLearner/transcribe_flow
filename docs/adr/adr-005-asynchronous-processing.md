# ADR-005: Asynchronous Processing for Transcription

Date: 2026-01-02
Status: Accepted

## Context

NFR1.1 and NFR1.2 require the interface to remain responsive and for processing to be non-blocking. Transcription of large files (up to 50MB) can take significant time (seconds to minutes).

## Forces

- **Responsiveness**: The UI must not hang.
- **User Feedback**: The user needs real-time status updates (NFR4.1).
- **Simplicity**: For a modular monolith, we want to avoid complex message brokers (like RabbitMQ) if possible in the initial phase.

## Decision

We will use an **Asynchronous Task Pattern** within the application.

- The frontend will upload the file.
- The backend will start the transcription process in a background thread or a simple task queue (like Celery or even just `asyncio` tasks if the load is low).
- The backend will provide a "status" endpoint or use WebSockets/Server-Sent Events (SSE) to push progress updates to the frontend.

## Alternatives Considered

- **Synchronous Request**: Rejected as it would time out and block the UI.
- **Heavyweight Message Broker**: Rejected for the initial version to keep the architecture simple.

## Consequences

- **Pros**:
  - Better UX with progress bars.
  - Prevents request timeouts.
- **Cons**:
  - Adds complexity to the state management (need to handle "In Progress" states).
  - Requires a way to track task status.
