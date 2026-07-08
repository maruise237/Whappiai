# AGENTS.md

This file is the root DOX guide for AI agents and contributors working in this repository.

## Project Overview

Whappi is a WhatsApp operations SaaS built on Express.js and a Next.js 15 dashboard. The active production path uses Evolution API for WhatsApp transport, Postgres for persistence, and Redis for queues, rate limits, and shared session state.

## DOX Workflow

- Before editing, read this file and then walk into the closest child `AGENTS.md` for the area you will touch.
- Prefer the most local guidance over generic assumptions.
- After meaningful architectural or UX changes, update the affected `AGENTS.md` so the docs stay aligned with reality.
- Keep child docs short, operational, and specific to the folder they protect.

## Commands

### Installation
```bash
npm install
cd frontend && npm install
```

### Development
```bash
npm run dev              # Runs backend (nodemon) + frontend (Next.js on port 3001) concurrently
npm run dev:backend      # Backend only with hot-reload
npm run dev:frontend     # Frontend only on port 3001
```

### Build & Production
```bash
npm run build:frontend   # Build Next.js static export to frontend/out
npm start                # Run production backend (serves frontend/out)
npm run start:prod       # Production with dotenv loaded
```

### Testing
```bash
npm test                 # Jest tests
```

### Docker
```bash
docker compose up --build -d   # Backend on :3000, Frontend on :3001
```

## Architecture

### Backend (Express.js - Root)
- **Entry point**: `index.js` - Server initialization, WebSocket setup, session management orchestration
- **`src/config/`**: Runtime configuration plus legacy SQLite compatibility shims
- **`src/db/`**: Active Postgres query layer and migrations
- **`src/models/`**: Data models (User, Session, ActivityLog)
- **`src/routes/`**:
  - `api.js` - Main API v1 router with sessions, messaging, moderation endpoints
  - `auth.js` - Authentication routes (login/logout)
  - `users.js` - User management routes
- **`src/services/`**:
  - `providers/EvolutionApiProvider.js` - Active WhatsApp transport adapter for Evolution API
  - `ai.js` - AI auto-responder integration (configurable endpoint/model)
  - `moderation.js` - Group moderation (blacklists, welcome messages)
  - `engagement.js` - Scheduled group messaging and engagement tasks
  - `groups.js` - Group profile and product link management
  - `GroupCacheService.js` - Group cache PostgreSQL (instant load + background refresh)
- **`src/utils/`**: Crypto, validation, phone number normalization, logging, response helpers
- **`src/middleware/`**: Auth checks, error handling

### Frontend (Next.js 15 + TypeScript - `/frontend`)
- React 19 with App Router
- Tailwind CSS v4 with shadcn/ui components
- Static export to `frontend/out` (served by Express in production)
- Key directories: `src/app/` (pages), `src/components/`, `src/hooks/`, `src/lib/`, `src/providers/`

### Admin vs User Experience
- **Admins now live in an exclusive admin shell.** They should not see user navigation, profile/billing flows, or the Wappy mascot.
- **Users live in the co-admin shell.** They keep access to sessions, moderation, billing, and support.
- Route `/dashboard` is role-sensitive:
  - admin -> admin center
  - non-admin -> user center

### Data Storage
- **Postgres runtime**: `src/db/query.js` - active async query layer used by the app
- **SQLite legacy**: `src/config/sqliteLegacy.js` - compatibility layer for old scripts/tests only
- **Filesystem**:
  - `media/` - Uploaded media files
  - `sessions/` - Local session fallback for non-production only

## Key Patterns

### WhatsApp Session Lifecycle
Sessions go through: `CONNECTING` -> `GENERATING_QR` -> `CONNECTED` (or `DISCONNECTED`). The Evolution provider owns the transport lifecycle, while Whappi persists status and token metadata locally.

### Authentication
- Admin dashboard uses Express sessions
- API endpoints use per-session tokens
- Master API key (`MASTER_API_KEY` env) for session creation without login

### Maintenance Mode
- Maintenance state is stored in `maintenance_settings`.
- Admin pages write through `/api/v1/admin/maintenance*`.
- User-facing maintenance overlay reads `/api/v1/maintenance/status`.
- Admins are intentionally bypassed by the overlay so they can recover the platform while maintenance is active.

### Payments
- Active payment provider is MoneyFusion (FusionPay).
- Never treat browser redirect as the source of truth for subscription activation.
- Webhook reconciliation and transaction correlation must stay idempotent and defensive.
- MoneyFusion webhooks have no HMAC signature; rely on `tokenPay` uniqueness and `personal_Info` correlation.
- MoneyFusion can send duplicate webhooks; deduplicate using `tokenPay` and stored transaction status.

### Admin Stability
- Do not mount normal admin/product routes behind strict auth-attempt rate limiters.
- Admin pages must degrade gracefully:
  - no raw JSON errors in UI
  - clear toast + inline message
  - avoid taking down the whole screen because a secondary panel failed

## Environment Variables (Critical)

- `TOKEN_ENCRYPTION_KEY`: **Must be 64 hex characters** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_DASHBOARD_PASSWORD`: Default admin password
- `SESSION_SECRET`: Express session signing key
- `MASTER_API_KEY`: For API-based session creation
- `DATABASE_URL`: Required in production
- `REDIS_URL`: Required in production
- `EVOLUTION_API_URL`: Required in production
- `EVOLUTION_API_KEY`: Required in production
- `WHATSAPP_PROVIDER`: Must be `evolution` in production

## Platform Notes

- Windows: prefer verifying local dev paths and Redis/Postgres env setup rather than relying on old filesystem session behavior
- Always use `--no-pager` with git commands in this shell

## Child DOX Index

- `frontend/src/app/dashboard/AGENTS.md` - shell split admin/user, dashboard route conventions
- `frontend/src/app/dashboard/support-inbox/AGENTS.md` - admin support inbox and transaction handling UI
- `frontend/src/app/dashboard/users/AGENTS.md` - SaaS account management console
- `frontend/src/app/dashboard/maintenance/AGENTS.md` - maintenance control panel and overlay expectations
- `src/routes/AGENTS.md` - backend HTTP route contracts and sensitive route guidance
- `src/services/AGENTS.md` - service-layer responsibilities and cross-cutting constraints
- `src/services/providers/AGENTS.md` - WhatsApp provider abstraction leaf
