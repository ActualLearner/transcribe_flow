# ADR-004: State Restoration via Local Storage

Date: 2026-01-02
Status: Accepted

## Context

NFR3.1 requires the system to attempt to restore the previous state after a refresh. Since we are currently not using authentication or a persistent database for user sessions, we need a client-side solution.

## Forces

- **Privacy (NFR2.1)**: We should avoid storing user data on the server longer than necessary.
- **User Experience**: Users shouldn't lose their edits if they accidentally refresh the page.
- **Complexity**: Implementing a full backend session/auth system is out of scope.

## Decision

We will use **Browser LocalStorage** to cache the current transcription state (segments and edits) on the client side.

- When a transcription is received or edited, the frontend updates the local storage.
- On page load, the frontend checks for existing state in local storage and populates the editor if found.
- The state should be cleared once the user explicitly "finishes" or starts a new upload.

## Alternatives Considered

- **Server-side Sessions**: Rejected as it requires a database and contradicts the "discard files/data" goal unless we implement complex TTL logic.
- **IndexedDB**: An alternative to LocalStorage, but LocalStorage is sufficient for the expected size of transcription text (well under 5MB for a 50MB audio file).

## Consequences

- **Pros**:
  - No server-side persistence needed for session recovery.
  - Privacy-preserving (data stays on user's machine).
- **Cons**:
  - Data is lost if the user clears browser cache or uses a different browser.
  - Security risk if the user is on a shared computer (though no PII is involved other than the transcript itself).
