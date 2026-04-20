# VC Platform Monorepo

Enterprise VC 2.0 platform built as a Bun workspace monorepo with a Next.js web app, a Fastify API gateway, shared TypeScript packages, and local infrastructure for Postgres and OpenBao.

## Workspace

- `apps/web-platform`: Next.js web application for sign-in, sign-up, organization setup, issuing, verifying, templates, schemas, invitations, and settings flows.
- `apps/api-gateway`: Fastify API gateway with health, auth, organizations, API keys, schemas, templates, credentials, and presentations modules.
- `packages/database`: Drizzle ORM database client and schema definitions.
- `packages/types`: Shared domain, auth, and API types.
- `packages/ledger-client`: Shared ledger client package.
- `packages/vc-sdk`: Shared VC SDK package.
- `packages/ui-kit`: Shared UI package.

## Tech Stack

- Bun workspaces
- Turbo
- Next.js
- Fastify
- Better Auth
- Drizzle ORM
- Postgres
- OpenBao

## Prerequisites

- Bun `1.3.9` or compatible
- Docker

## Environment

1. Copy `.env.example` to `.env`.
2. Review and update values as needed.

Key local defaults:

- Web app: `http://localhost:3000`
- API gateway: `http://localhost:4000`
- Postgres: `postgresql://postgres:postgres@localhost:5432/vc_platform`
- OpenBao: `http://localhost:8200`

The API gateway also expects a crypto engine endpoint via `CRYPTO_ENGINE_URL`. If you are not running that service locally yet, keep the placeholder value from `.env.example` and only use flows that do not depend on it.

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Start local infrastructure:

```bash
bun run docker:up
```

3. Generate database migrations:

```bash
bun run db:generate
```

4. Apply migrations:

```bash
bun run db:migrate
```

5. Start all workspace apps in development mode:

```bash
bun run dev
```

## Common Commands

```bash
bun run dev
bun run build
bun run lint
bun run typecheck
bun run test
bun run db:generate
bun run db:migrate
bun run db:studio
bun run docker:up
bun run docker:down
```

## What Runs Locally

- `apps/web-platform` runs the Next.js frontend on port `3000`.
- `apps/api-gateway` runs the Fastify API gateway on port `4000`.
- `docker/docker-compose.yml` starts Postgres and OpenBao.

## API Notes

- Health endpoint: `GET /health`
- Auth is hosted by the API gateway and consumed by the web app across separate web and API origins.
- Organization context is integrated into the web workspace flows.

## Database

Database config lives under `packages/database` and uses Drizzle. Shared schema exports currently include Better Auth tables and credential-related tables.
