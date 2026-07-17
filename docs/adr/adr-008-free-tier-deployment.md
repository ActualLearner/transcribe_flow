# ADR-008: Free-Tier Deployment Stack (Render + Neon + WhiteNoise)

Date: 2026-07-17
Status: Accepted

## Context

The product must be deployed on a $0 budget yet be reliably reachable from a portfolio README. We need hosting for the Django app, a persistent database, and static file serving for the SPA.

## Forces

- **$0 hard budget**, no credit card.
- **Single deploy unit** (ADR-001 modular monolith) — fewer moving parts, one URL.
- **Persistence**: transcript state must survive deploys/restarts (NFR3.1); free hosts have ephemeral filesystems.
- **Recruiter UX**: the demo link must work on first click, tolerating a cold start.

## Decision

- **Hosting: Render free web service** (`render.yaml` blueprint). Build: install deps → `vite build` → `collectstatic`. Start: `migrate` → threaded `gunicorn`.
- **Database: Neon free Postgres** via `DATABASE_URL` (`dj-database-url` + `psycopg[binary]`). SQLite locally. Neon's free plan does not expire (unlike Render's own free Postgres, which is deleted after ~90 days) — the deciding factor.
- **Static files: WhiteNoise** serving the built SPA and Django admin statics from the same origin — no CDN, no CORS, no second deploy.
- **Media files: none** (per NFR2.1 uploads are never persisted), which conveniently sidesteps the ephemeral-filesystem problem entirely.
- **Secrets** via Render environment variables; documented in `.env.example`.

Accepted free-tier trade-offs, documented in the README:

- Service sleeps after 15min idle; cold start ~30–60s (README sets expectations next to the demo link).
- 750 instance-hours/month (one always-on-when-used service fits).
- Neon free plan: 0.5GB storage, scale-to-zero with ~5min idle timeout (first query after idle adds ~1s).

## Alternatives Considered

- **Railway / Fly.io**: trial credits rather than a true ongoing free tier — dies after the credit runs out.
- **PythonAnywhere**: free tier blocks arbitrary outbound API calls (whitelist) — Groq calls would fail.
- **Render free Postgres**: deleted after 90 days — unacceptable for a standing portfolio demo.
- **Vercel/Netlify frontend + separate API host**: two deploys, CORS, and env juggling for zero benefit at this scale; contradicts the single-deploy-unit decision.

## Consequences

- **Pros**: genuinely $0 forever; one-click blueprint deploy; one origin; DB survives everything.
- **Cons**: cold starts (accepted, documented); 512MB RAM bounds concurrency (fine — Groq does the compute); vendor free-tier terms can change (both vendors are substitutable: the app is a stock Django+Postgres deploy).
