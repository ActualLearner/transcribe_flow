# TranscribeFlow — Agent Instructions

Free, no-signup transcription web app (Django + DRF backend, React/TS SPA) deployed entirely on free-tier infrastructure. This is a **portfolio project**: code quality, tests, and documented architectural judgment are product features.

## Read before working

1. `CONTEXT.md` — ubiquitous language + domain invariants. Use its vocabulary everywhere.
2. `docs/prd.md` — the product definition (authoritative).
3. `docs/adr/` — decisions. ADR-006..009 define the current stack. Never contradict an ADR silently; flag it.
4. `docs/api_spec.md` — the API contract.

## Stack (fixed by ADRs — do not substitute)

- Backend: Python 3.12, Django 6, DRF. Settings: `src/config/settings/{base,dev,prod}.py`.
- Providers: Groq (`whisper-large-v3-turbo` STT, `llama-3.3-70b-versatile` summaries) behind `TranscriptionProvider`/`SummaryProvider` ports; `Fake*` adapters for dev/tests. Selection via env (`TRANSCRIPTION_PROVIDER=groq|fake`).
- Jobs: in-process `ThreadPoolExecutor` + DB status + client polling (ADR-007). **No Celery/Redis. No WebSockets.**
- DB: SQLite dev, Postgres (Neon, `DATABASE_URL`) prod.
- Frontend: React 18 + TypeScript + Vite + Tailwind in `frontend/`; built assets served by Django/WhiteNoise (ADR-009).
- Deploy: Render free tier via `render.yaml` (ADR-008).

## Hard rules

- **Never persist uploaded media** (NFR2.1). Files exist only in memory/temp during the provider call.
- **Service layer never imports concrete adapters** — ports are injected; composition happens via settings.
- **No secrets in the repo.** Env vars only; document new ones in `.env.example`.
- **25MB upload cap** and formats `.mp3 .wav .mp4 .m4a` — enforced client- AND server-side.
- Max file upload size, model names, executor size etc. live in settings, not hardcoded.

## Workflow

- **TDD** (`/tdd` skill): red → green → refactor. Write the failing test first for every service/API behaviour.
- Tests: backend `pytest` + `pytest-django` (run: `cd src && pytest`); frontend `vitest` + Testing Library + MSW; use `fromPartial` from `@total-typescript/shoehorn` in TS tests instead of `as` casts.
- Test through the seams: HTTP API with fake providers (primary), adapter fixture-mapping tests, pure formatter tests. Jobs run inline in tests (settings flag). Never assert implementation details.
- Lint/format: `ruff check` + `ruff format` (Python), `tsc --noEmit` + Vite defaults (TS). CI (`.github/workflows/ci.yml`) must be green.
- Git: branch per ticket (`feat/NN-slug`), conventional commits, PR to `main`. Reference the ticket issue in the PR body.
- One ticket = one PR = one fresh context. Finish with all acceptance criteria met and CI green before marking done.

## Commands

```bash
# Backend (from repo root; venv at ./venv)
source venv/bin/activate
python src/manage.py runserver              # dev server :8000
cd src && pytest                            # backend tests
ruff check src && ruff format --check src   # lint

# Frontend (from frontend/)
npm run dev        # Vite dev server (proxies /api → :8000)
npm test           # vitest
npm run build      # production build
npx tsc --noEmit   # type check
```

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
