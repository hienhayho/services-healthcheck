# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm tsc --noEmit # Type-check without emitting
```

Run Docker:
```bash
./run.sh --port 3000   # Build image and start container (reads .env.local)
./down_service.sh      # Stop and remove container
```

## Architecture

### Startup
`instrumentation.ts` runs once at Node.js startup (guarded by `process.env.NEXT_RUNTIME === 'nodejs'`). It validates required env vars, calls `initDb()` to apply `db/schema.sql`, then `startScheduler()` to register all enabled services as cron jobs.

### Scheduler
`lib/scheduler.ts` maintains a `Map<serviceId, ScheduledTask>` in module scope. Each enabled service gets its own `node-cron` job. On tick: runs the checker → saves result to DB → sends Telegram report. `reloadService(id)` and `stopService(id)` are called by API routes after CRUD operations.

### Checkers
`lib/checkers/index.ts` dispatches to `llm.ts`, `embedding.ts`, or `http.ts` based on `service.type`. All three: record `Date.now()` diff for latency, classify `ok` / `degraded` (latency > `DEGRADED_THRESHOLD_MS`, default 3000ms) / `down` (error or wrong status), and return `{ status, latency_ms, message }`.

- **LLM**: POST OpenAI-compatible chat completion, checks `choices[0].message.content` (falls back to `reasoning_content` for thinking models like Qwen3).
- **Embedding**: POST OpenAI-compatible embeddings, checks `data[0].embedding` is an array.
- **HTTP**: Fetch with configurable method/headers, compares status against `expected_status`.

### Database
`lib/db.ts` — `better-sqlite3` singleton. Three tables: `services`, `check_results`, `alert_channels`. Service-specific config (URL, model, API key, etc.) is stored as a JSON string in `services.config`.

### Auth
JWT (HS256, 7-day TTL) via `jose`, stored in httpOnly cookie `hc_token`. Auth is enforced at the **layout level** (`app/layout.tsx`) — it reads the cookie, verifies the token, and redirects to `/login` if invalid. API routes at `/api/services`, `/api/results`, `/api/alert-channels` rely on the browser being authenticated (no per-route middleware). `proxy.ts` handles `/api/auth/login` and `/api/auth/logout`.

### Telegram
`lib/telegram.ts` — `formatReport()` produces two formats:
- **All OK**: compact single-line per service (`✅ Name  latency`)
- **Has issues**: compact OK lines first, then divider-separated cards for degraded/down services with error detail

### UI Components
Uses **shadcn/ui built on Base UI** (not Radix). This means:
- No `asChild` prop — use `render={<element />}` instead on triggers/slots.
- `onValueChange` in Select receives `string | null` — always guard with `?? fallback`.
- Dialog default width is `sm:max-w-sm` in the base component; override with `sm:max-w-*` (not `max-w-*`) so `twMerge` resolves the conflict correctly.

### Key env vars
| Var | Required | Notes |
|-----|----------|-------|
| `AUTH_USERNAME` | Yes | Login username |
| `AUTH_PASSWORD` | Yes | Login password |
| `AUTH_SECRET` | Yes | JWT signing secret, min 32 chars |
| `DEGRADED_THRESHOLD_MS` | No | Default 3000 |

`lib/auth.ts` `requireEnv()` throws at startup if any required var is missing or equals the build-time placeholder string.

## Docker
3-stage build: **deps** (pnpm 10.7.0 + native build tools) → **builder** → **runner** (Alpine, non-root `nextjs` UID 1001). `AUTH_*` secrets must NOT go in Dockerfile `ENV`/`ARG` — pass them via `--env` flags at runtime (handled by `run.sh`). SQLite DB persists at `/app/data/healthcheck.db` via volume mount.
