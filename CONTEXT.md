# TranscribeFlow — Domain Context

Ubiquitous language and core concepts. Read this before working anywhere in the codebase. Full detail: [docs/domain_model.md](./docs/domain_model.md).

## Glossary

| Term | Meaning | Avoid calling it |
|---|---|---|
| **Transcription** | The aggregate root: one processed upload — status, filename, duration, transcript, summary. | "job", "task", "upload" |
| **Segment** | One timestamped piece of transcribed text (`start_time`, `end_time`, `text`), child of a Transcription. | "line", "cue" (cue is SRT-output-only), "chunk" |
| **Transcript** | The ordered collection of all Segments of a Transcription. | "text" (ambiguous) |
| **Summary** | AI-generated condensed version of the Transcript, produced only on explicit user request. | — |
| **Provider** | An external AI service reached through a port (Groq in production, Fake in dev/tests). | naming a vendor in domain/service code |
| **Port** | A `Protocol` the service layer depends on: `TranscriptionProvider`, `SummaryProvider`. | "interface class" |
| **Adapter** | A concrete Provider implementation mapping vendor responses to domain types. | — |
| **TranscriptData** | The provider-neutral value object an adapter returns (segments + duration + full text). | vendor response names |
| **Job** | The background unit of work that runs a transcription (ADR-007 async-lite). | "task" (avoid Celery connotations) |
| **Status** | Transcription lifecycle: `pending` → `processing` → `completed` \| `failed`. Terminal states: `completed`, `failed`. | "state" |
| **Export** | A download rendering of the Transcript: `txt` (no timestamps) or `srt` (numbered cues). | — |
| **Orphan reconciliation** | On startup, rows stuck in `processing` are marked `failed` (NFR3.2). | — |

## Invariants

- Media files are **never persisted** (NFR2.1). Only transcript state lives in the DB.
- A Transcription in a terminal status never returns to a non-terminal one (regenerating a summary does not change `status`).
- Segments are ordered by `start_time`; exports and the `text` property always reflect **current (edited)** segment text.
- The service layer never imports a concrete adapter; selection happens at the composition root via settings.

## Where decisions live

Architecture decisions: `docs/adr/`. Product definition: `docs/prd.md`. API contract: `docs/api_spec.md`.
