# ADR-003: Abstract Transcription Providers

Date: 2026-01-02
Status: Accepted

## Context

The system relies on external services for transcription (e.g., OpenAI Whisper). We need to ensure that we are not locked into a single provider.

## Forces

- **Vendor Lock-in**: Relying solely on one API (like OpenAI) is risky.
- **Cost/Quality Trade-offs**: Different providers might offer better pricing or accuracy for specific languages/file types.
- **Testing**: We need to be able to mock transcription during development and testing.

## Decision

We will define a common interface (Port) for transcription providers.

```python
class TranscriptionProvider(Protocol):
    def transcribe(self, file_content: bytes) -> Transcript:
        ...
```

All concrete integrations (OpenAI, local Whisper, Deepgram, etc.) must implement this interface and map their specific response formats to our internal `Transcript` domain model.

## Alternatives Considered

- **Direct API integration**: Rejected as it makes swapping providers difficult and complicates testing.

## Consequences

- **Pros**:
  - Easy to swap or support multiple providers.
  - Simplified testing via Mocks/Fakes.
- **Cons**:
  - We might need to "lowest common denominator" the features if some providers offer unique capabilities that others don't.
