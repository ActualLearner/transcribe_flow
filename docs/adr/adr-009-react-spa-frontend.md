# ADR-009: React + TypeScript SPA Served as Django Static Files

Date: 2026-07-17
Status: Accepted

## Context

The v1 draft left the frontend unspecified ("HTTP API, CLI, or GUI" entrypoints). The product needs a polished interactive editor (inline segment editing, live status polling, drag-and-drop upload) and the portfolio needs to demonstrate typed full-stack work.

## Forces

- **Interactivity**: segment-level inline editing and polling UX exceed what Django templates + sprinkles of JS handle cleanly.
- **Portfolio signal**: React + TypeScript is the highest-recognition frontend stack.
- **Single deploy unit** (ADR-001, ADR-008): one origin, one service, no CORS.
- **Testing culture**: typed frontend enables vitest + Testing Library + shoehorn conventions.

## Decision

- **React 18 + TypeScript + Vite**, living in `frontend/` at the repo root.
- **Production**: `vite build` emits static assets; `collectstatic` + WhiteNoise serve them from the Django origin. Django serves `index.html` as the catch-all route; the SPA owns client-side routing.
- **Development**: Vite dev server with a proxy of `/api` → Django on :8000 (hot reload without CORS).
- **Styling**: Tailwind CSS.
- **API access**: a small typed client module wrapping `fetch`; response types mirror the DRF serializers.
- **State**: React hooks + a polling hook; transcription id persisted to `localStorage` for state restoration (ADR-004). No Redux — the state graph is one aggregate.

## Alternatives Considered

- **Django templates + HTMX**: fewer moving parts and genuinely fine for the upload flow, but inline segment editing + polling UX gets awkward, and it forfeits the TypeScript portfolio signal.
- **Next.js on Vercel**: strong stack, but forces a second deploy + CORS + duplicated env handling; SSR buys nothing for an app behind an upload interaction.
- **Create React App**: deprecated; Vite is the current standard.

## Consequences

- **Pros**: best-in-class DX and portfolio signal; single origin; SPA is independently testable with MSW.
- **Cons**: two toolchains (pip + npm) in one repo and a two-step build (accepted — CI and `render.yaml` encode it); bundle served by Python (WhiteNoise is adequate at this scale).
