# ADR-007: In-Process Async-Lite Job Execution

Date: 2026-07-17
Status: Accepted (refines ADR-005)

## Context

ADR-005 chose an asynchronous task pattern but left the mechanism open ("background thread or a simple task queue like Celery"). The free-tier hosting constraint forces the choice: free platforms provide **one** web process — no worker dyno, no Redis, no always-on broker. Meanwhile, Groq transcribes typical files in seconds, so jobs are short.

## Forces

- **Free tier**: single 512MB web process; no Redis/broker available for $0 that is worth its operational cost here.
- **Responsiveness (NFR1.1)** and **real-time status (NFR4.1)** still required.
- **Job duration**: seconds, not minutes — Groq does the heavy compute.
- **Reliability (NFR3.1)**: a refresh (or process restart) must not leave the user staring at a forever-spinner.

## Decision

Run jobs on a **process-local `ThreadPoolExecutor`** with **DB-backed status**:

1. `POST /api/transcriptions/` validates, creates the row (`pending`), submits the job, returns `202` immediately.
2. The worker thread sets `processing`, calls the provider port, bulk-creates segments, then sets `completed` (or `failed` + `error_message`).
3. The client polls `GET /api/transcriptions/{id}/` (~1.5s interval) until a terminal status.
4. **Orphan reconciliation:** on app startup, any row still in `processing` is marked `failed` ("interrupted by restart") — a restart can never strand a job in a non-terminal state.
5. Tests run jobs **inline** (synchronous executor) via a settings flag, keeping the test suite deterministic.

Gunicorn runs a threaded worker so request threads and the executor share one process.

## Alternatives Considered

- **Celery + Redis**: the textbook answer, but requires infrastructure the free tier doesn't have. Operationally heavy for jobs that finish in seconds.
- **Fully synchronous request**: simplest, but holds an HTTP request open for the whole provider call — flirts with free-tier proxy timeouts on large files and gives no status UX.
- **SSE/WebSockets for push updates**: nicer than polling but adds connection-management complexity for updates that arrive within seconds anyway; free-tier proxies handle long-lived connections poorly.

## Consequences

- **Pros**: zero extra infrastructure; keeps the `202` + polling contract; portfolio demonstrates deliberate right-sizing rather than cargo-culted queues.
- **Cons**: a process crash mid-job loses the job (mitigated: reconciliation marks it failed and the user can re-upload); jobs don't survive deploys; horizontal scaling would need a real queue — explicitly acceptable at this scale and documented as the upgrade path.
