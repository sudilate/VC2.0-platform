# VC Platform Monorepo

Phase 1 scaffold for an enterprise Verifiable Credentials platform.

## Included

- Bun workspace monorepo
- Next.js web app placeholder
- Bun + Fastify API gateway skeleton
- Rust gRPC crypto engine skeleton
- Drizzle ORM database package
- Docker Compose for Postgres and OpenBao

## Getting Started

1. Copy `.env.example` to `.env`.
2. Run `bun install`.
3. Run `bun run docker:up`.
4. Generate migrations with `bun run db:generate`.
5. Start workspace services with `bun run dev`.

## Phase 1 Scope

This scaffold establishes the repo structure, local infrastructure, shared contracts, and service boundaries needed for Phase 2 implementation.
