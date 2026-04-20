# AGENTS.md

## Repo Shape

- Bun workspace monorepo. Root workspaces are `apps/*` and `packages/*`.
- Main runtime entrypoints:
- `apps/api-gateway/src/index.ts` boots Fastify and imports `./lib/db` on startup, so starting the API touches Postgres immediately.
- `apps/api-gateway/src/app.ts` wires the route modules: auth, organizations, API keys, schemas, templates, credentials, presentations.
- `apps/web-platform/app/` is the Next.js App Router frontend. Protected app navigation lives in `apps/web-platform/app/app/layout.tsx`.
- Shared TS path aliases are defined in `tsconfig.base.json` for `@vc-platform/{types,database,ledger-client,ui-kit,vc-sdk}` and point directly at `src`.

## Commands

- Install: `bun install`
- Start infra: `bun run docker:up`
- Stop infra: `bun run docker:down`
- Run all dev servers: `bun run dev`
- Full repo verification from root:
- `bun run lint`
- `bun run typecheck`
- `bun run test`
- Database:
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:studio`

## Focused Verification

- Prefer package-local commands for faster checks instead of full Turbo runs.
- API gateway typecheck: `bun --cwd apps/api-gateway run typecheck`
- API gateway tests: `bun --cwd apps/api-gateway test`
- Single API gateway test file: `bun --cwd apps/api-gateway test src/modules/credentials/routes.test.ts`
- Web app typecheck: `bun --cwd apps/web-platform run typecheck`
- Web app build: `bun --cwd apps/web-platform run build`
- The only verified test files currently live under `apps/api-gateway/src/modules/*.test.ts`; there are no repo tests under `apps/web-platform` or `packages/*` right now.

## Env And Infra Quirks

- Root `.env` is required. Copy from `.env.example`.
- `apps/api-gateway/src/config/env.ts` and `packages/database/drizzle.config.ts` both load `../../.env`. Keep env in the repo root.
- Auth is hosted by the API gateway, not the Next app. Cross-origin cookie flows rely on both `WEB_PLATFORM_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` matching the actual local ports/origins.
- Local infra is only Postgres and OpenBao via `docker/docker-compose.yml`.
- `CRYPTO_ENGINE_URL` is required in env, but no local crypto engine service exists in this repo. Credential/presentation tests stub crypto; real runtime flows that depend on signing/verifying may need an external service.

## Database

- Drizzle schema source: `packages/database/src/schema/*.ts`
- Generated migrations: `packages/database/drizzle/`
- After schema edits, generate a migration before finishing. Apply it locally with `bun run db:migrate` if your change depends on the updated schema.

## Search Gotcha

- Exclude generated directories when searching or reading broadly: root `.gitignore` ignores `.next/` and `.turbo/`, but they may still exist locally and pollute results.
