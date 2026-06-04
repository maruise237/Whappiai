# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Whappi is a WhatsApp API server built with Express.js and the `@whiskeysockets/baileys` library, paired with a Next.js 15 dashboard. It provides session management, messaging capabilities, group moderation, and AI-powered auto-responders.

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
- **`src/config/`**: Database configuration (SQLite via better-sqlite3)
- **`src/models/`**: Data models (User, Session, ActivityLog)
- **`src/routes/`**: 
  - `api.js` - Main API v1 router with sessions, messaging, moderation endpoints
  - `auth.js` - Authentication routes (login/logout)
  - `users.js` - User management routes
- **`src/services/`**:
  - `whatsapp.js` - Baileys connection management, QR code generation, message handling
  - `ai.js` - AI auto-responder integration (configurable endpoint/model)
  - `moderation.js` - Group moderation (blacklists, welcome messages)
  - `engagement.js` - Scheduled group messaging and engagement tasks
  - `groups.js` - Group profile and product link management
- **`src/utils/`**: Crypto, validation, phone number normalization, logging, response helpers
- **`src/middleware/`**: Auth checks, error handling

### Frontend (Next.js 15 + TypeScript - `/frontend`)
- React 19 with App Router
- Tailwind CSS v4 with shadcn/ui components
- Static export to `frontend/out` (served by Express in production)
- Key directories: `src/app/` (pages), `src/components/`, `src/hooks/`, `src/lib/`, `src/providers/`

### Data Storage
- **SQLite**: `src/config/database.sqlite` - Users, sessions metadata, activity logs
- **Filesystem**: 
  - `auth_info_baileys/<sessionId>/` - Baileys auth credentials per session
  - `media/` - Uploaded media files
  - `sessions/` - Express session files (FileStore)

## Key Patterns

### WhatsApp Session Lifecycle
Sessions go through: `CONNECTING` → `GENERATING_QR` → `CONNECTED` (or `DISCONNECTED`). The `whatsappService` manages Baileys sockets in-memory (`activeSockets` Map), with automatic reconnection using exponential backoff (up to 15 retries).

### Authentication
- Admin dashboard uses Express sessions with file-based storage
- API endpoints use per-session tokens (stored in `sessionTokens` Map)
- Master API key (`MASTER_API_KEY` env) for session creation without login

## Environment Variables (Critical)

- `TOKEN_ENCRYPTION_KEY`: **Must be 64 hex characters** - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ADMIN_DASHBOARD_PASSWORD`: Default admin password
- `SESSION_SECRET`: Express session signing key
- `MASTER_API_KEY`: For API-based session creation

## Platform Notes

- Windows: The codebase includes retry logic for EPERM errors during credential saves (see `whatsapp.js` saveCreds wrapper)
- Always use `--no-pager` with git commands in this shell
