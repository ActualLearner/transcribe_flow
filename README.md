# TranscribeFlow

Free, no-signup audio/video transcription: upload a file, get a timestamped transcript in seconds, edit it inline, download as `.txt`/`.srt`, and generate a one-click AI summary. Uploaded media is **never stored** — it's streamed to the transcription provider and discarded.

**Live demo:** [transcribeflow-one.vercel.app](https://transcribeflow-one.vercel.app) (SPA on Vercel) → API on [Render](https://transcribeflow-t2gy.onrender.com) free tier — first visit after idle takes ~30–60s to wake up.

## Why this project is interesting (the engineering story)

The whole product runs on **$0/month infrastructure**, and the architecture is deliberately *right-sized* for that constraint instead of cargo-culting the textbook stack:

- **Hexagonal architecture (ports & adapters)** — transcription and summarization sit behind `TranscriptionProvider`/`SummaryProvider` ports. Production uses Groq (`whisper-large-v3-turbo`, `llama-3.3-70b-versatile`); dev and CI use deterministic fake adapters, so the entire test suite runs offline with zero API keys.
- **Async without a queue** — free tiers give you one process: no Celery worker, no Redis. Uploads return `202` and run on an in-process `ThreadPoolExecutor` with DB-backed status and client polling; orphaned jobs are reconciled to `failed` on restart. The trade-off analysis lives in [ADR-007](docs/adr/adr-007-async-lite-execution.md).
- **Privacy by architecture** — media files are never written to storage, which also neatly sidesteps free-tier ephemeral filesystems ([ADR-008](docs/adr/adr-008-free-tier-deployment.md)).
- **Typed full stack** — Django 6 + DRF backend, React 18 + TypeScript + Vite SPA served from the same origin via WhiteNoise ([ADR-009](docs/adr/adr-009-react-spa-frontend.md)).
- **TDD + CI** — pytest through the HTTP seam with injected fakes; vitest + Testing Library + MSW on the frontend; ruff, tsc, and both suites gate every PR.

Every significant decision is an ADR in [`docs/adr/`](docs/adr/). The product definition is in [`docs/prd.md`](docs/prd.md).

## Stack

| Layer | Choice | Free tier |
|---|---|---|
| Backend | Python 3.12, Django 6, DRF | — |
| Frontend | React 18, TypeScript, Vite, Tailwind | — |
| Transcription & LLM | Groq API | ✅ no card required |
| Database | Neon Postgres (SQLite in dev) | ✅ doesn't expire |
| Hosting | Render web service (single deploy: API + SPA + jobs) | ✅ |

## Running locally

```bash
git clone <repo> && cd transcribe_flow
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # defaults to fake providers — no API key needed
python src/manage.py migrate
python src/manage.py runserver  # API on :8000

# in another terminal — frontend with hot reload
cd frontend && npm install && npm run dev   # SPA on :5173, proxies /api
```

Real transcription locally: set `TRANSCRIPTION_PROVIDER=groq` and a `GROQ_API_KEY` (free at [console.groq.com](https://console.groq.com)) in `.env`.

## Tests

```bash
pytest                        # backend (offline, fake providers)
cd frontend && npm test       # frontend
```

## Deploying (free)

1. Create a free [Neon](https://neon.tech) Postgres project → copy the connection string.
2. Create a free [Groq](https://console.groq.com) API key.
3. On [Render](https://render.com): New → Blueprint → point at this repo (`render.yaml`), set `DATABASE_URL` and `GROQ_API_KEY`.

## Docs

- [PRD](docs/prd.md) · [Requirements](docs/requirements.md) · [Architecture](docs/architecture.md) · [API spec](docs/api_spec.md) · [Domain model](docs/domain_model.md) · [ADRs](docs/adr/)

## Known free-tier limits (by design)

- Uploads capped at **25MB** (Groq free-tier ceiling) — `.mp3`, `.wav`, `.mp4`, `.m4a`.
- Cold start after 15 min idle (~30–60s).
- Shared Groq rate limits (7,200 audio-sec/hour) — the app surfaces a friendly "busy, retry shortly" when hit.
