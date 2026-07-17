# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the ubiquitous-language glossary and domain invariants.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
- **`docs/prd.md`** — the product definition (problem, user stories, implementation & testing decisions).
- **`docs/api_spec.md`** — the API contract between SPA and backend.

This is a **single-context** repo: one `CONTEXT.md` + one `docs/adr/` at the root.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids (e.g. say **Segment**, not "line"; say **Job**, not "task"; say **Provider/Adapter**, not a vendor name, in domain code).

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-007 (async-lite execution) — but worth reopening because…_
