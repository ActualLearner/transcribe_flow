# ADR-006: Groq as Default Transcription & Summary Provider

Date: 2026-07-17
Status: Accepted

## Context

The project must run entirely on free infrastructure (hard constraint). The original draft assumed OpenAI Whisper, which is paid per audio-minute. We need a transcription provider and a summary LLM that cost $0 and still produce production-quality results.

## Forces

- **Zero budget**: no paid APIs, no credit card.
- **Quality**: transcripts must be good enough that the editor feature is a convenience, not a necessity.
- **Free-tier hosting**: 512MB RAM / 0.1 CPU rules out running Whisper locally.
- **ADR-003**: whatever we pick must sit behind the provider port, not leak into the domain.

## Decision

Use **Groq's free tier** for both external AI capabilities, behind the ports defined in ADR-003:

- **Transcription:** `whisper-large-v3-turbo` via Groq's speech-to-text endpoint.
- **Summarization:** `llama-3.3-70b-versatile` via Groq's chat completions endpoint.

One provider, one API key, one SDK. Verified free-tier constraints (2026-07) that become product constraints:

- **25MB max file size** on the free-tier speech-to-text endpoint → the app's upload cap is 25MB (was 50MB in the v1 requirements draft).
- **7,200 audio-seconds/hour, 20 req/min, 2,000 req/day** → rate-limit responses are surfaced to users as a friendly "busy, try again shortly" (HTTP 429).

A `FakeTranscriptionAdapter` and `FakeSummaryAdapter` (deterministic canned output) are first-class adapters used in development and all CI tests, so no API key or network is ever needed to develop or test.

## Alternatives Considered

- **OpenAI Whisper API**: best-known option, but paid. Violates the zero-budget constraint.
- **Local `faster-whisper`**: truly free but CPU-bound; free hosting tiers (512MB RAM) would OOM or take minutes per file.
- **Mock-only demo**: zero cost and always up, but the live demo wouldn't be real — weak portfolio story.

## Consequences

- **Pros**: $0, extremely fast inference (seconds), one vendor/key for both features, real live demo.
- **Cons**: 25MB cap; free-tier rate limits shared across all demo visitors; vendor could change free-tier terms (mitigated by ADR-003 — an OpenAI adapter is a small, isolated addition).
