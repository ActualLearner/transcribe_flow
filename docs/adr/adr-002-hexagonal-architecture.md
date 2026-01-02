# ADR-002: Implement Hexagonal Architecture

Date: 2026-01-02
Status: Accepted

## Context

Following the decision to use a modular monolith (ADR-001), we need a consistent way to structure the code within those modules to ensure high testability and decoupling from external dependencies.

## Forces

- **Testability**: We want to test business logic without relying on external APIs (OpenAI) or databases.
- **Flexibility**: We might want to swap transcription providers or storage mechanisms in the future.
- **Complexity Management**: Separation of concerns helps manage the "Cosmic Python" patterns (Service Layer, Repository, etc.).

## Decision

We will implement **Hexagonal Architecture** (also known as Ports and Adapters).

- **Domain Model**: At the center, containing pure business logic.
- **Ports**: Interfaces that define how the domain interacts with the outside world (e.g., `TranscriptionProvider`, `TranscriptionRepository`).
- **Adapters**: Concrete implementations of ports (e.g., `WhisperAdapter`, `SqlAlchemyRepository`).
- **Service Layer**: Coordinates the flow of data between adapters and the domain model.

## Alternatives Considered

- **Layered Architecture (N-Tier)**: Rejected because it often leads to domain logic leaking into the persistence layer or being tightly coupled to it.

## Consequences

- **Pros**:
  - Domain logic is independent of external factors.
  - Very easy to unit test.
  - Clear boundaries between business rules and infrastructure.
- **Cons**:
  - Initial boilerplate (more files and abstractions).
  - Can be overkill for extremely simple features.
