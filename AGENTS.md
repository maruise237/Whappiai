# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Whappi is a WhatsApp operations SaaS built on Express.js and a Next.js 15 dashboard. The active production path uses Evolution API for WhatsApp transport, Postgres for persistence, and Redis for queues, rate limits, and shared session state.

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
