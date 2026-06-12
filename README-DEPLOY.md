# Whappi server deployment (Dokploy + Traefik + Evolution API)

This document describes the current production-style deployment path for Whappi on a Linux VPS using Dokploy, Traefik, and Evolution API.

## Architecture

- **Whappi**: product app, dashboard, auth, billing, orchestration
- **Evolution API**: WhatsApp session engine (QR, state, send/receive)
- **Dokploy**: build + container orchestration
- **Traefik**: HTTPS routing and certificates
- **PostgreSQL**: persistent product data
- **Redis**: sessions, queue, rate limits, shared runtime state

Current runtime shape in this repository:
- Single app container exposed on port `3000`
- Public domain routed by Traefik to the app container
- `WHATSAPP_PROVIDER=evolution`
- Redis-backed sessions, queue, and rate limits

## Prerequisites

1. Linux VPS with Docker and Dokploy already working
2. Traefik / Dokploy network available: `dokploy-network`
3. Domain pointed to the VPS
4. Clerk production keys
5. Evolution API instance already deployed and reachable over HTTPS
6. GitHub repo connected to Dokploy or available on the VPS

## Required environment variables

Use `.env.example` as the source of truth.

Critical variables:
- `APP_URL`
- `FRONTEND_URL`
- `FRONTEND_DOMAIN`
- `NEXT_PUBLIC_API_URL`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `WHATSAPP_PROVIDER=evolution`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`

Recommended:
- `MASTER_ADMIN_EMAIL`
- `MASTER_API_KEY`
- `ADMIN_DASHBOARD_PASSWORD`

Optional:
- `CAL_CLIENT_ID`, `CAL_CLIENT_SECRET`, `CAL_REDIRECT_URI`
- payment provider variables

## Important production notes

### 1) Encryption key stability
`TOKEN_ENCRYPTION_KEY` must remain stable across restarts and redeploys.
If you change it after encrypted model keys already exist in the database, startup will log decrypt errors until those records are rotated or reset.

### 2) Redis is required
Production expects Redis to be reachable at startup.
If `REDIS_URL` is missing or the Redis service is unavailable, Whappi now fails fast instead of starting in degraded mode.

### 3) Evolution provider mode
Whappi is expected to run with:

```env
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://your-evolution-domain
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_WEBHOOK_SECRET=your-shared-secret
```

## Dokploy deployment steps

### Option A - Deploy from GitHub in Dokploy
1. Push the repo to GitHub
2. In Dokploy, create or open the Whappi compose app
3. Point Dokploy to this repository
4. Confirm `docker-compose.yml` at repo root is used
5. Fill the Dokploy Environment tab using `.env.example`
6. Deploy

### Option B - Deploy from repo already present on the VPS
1. Update the code on the VPS
2. Ensure Dokploy compose app points to this directory/repo state
3. Update environment variables
4. Redeploy the compose app

## Container expectations

The compose file currently:
- builds `whappi-frontend` from `Dockerfile.backend`
- exposes internal port `3000`
- mounts persistent volumes:
  - `whappi-data`
  - `whappi-media`
  - `whappi-redis`
  - `whappi-postgres`
- attaches to external network `dokploy-network`

## Post-deploy verification

### App health

```bash
curl -sS https://your-domain/api/health
```

Expected shape:

```json
{"status":"healthy"}
```

### Container logs

```bash
docker compose logs --tail=100 whappi-frontend
```

Healthy startup signs:
- database schema initialized
- indexes added
- server running on port 3000
- no repeated Redis timeout errors
- no `Failed to decrypt API key` errors

### Evolution connectivity
From inside the container or app code path, confirm the provider can query an instance status successfully.

## Troubleshooting

### Redis timeout spam
Cause:
- `REDIS_URL` configured but Redis service absent/unreachable

Fix:
- empty `REDIS_URL`
- redeploy

### `bad decrypt` on startup
Cause:
- encrypted DB values were created with another `TOKEN_ENCRYPTION_KEY`

Fix:
- restore the original key, or
- rotate/reset the affected encrypted fields, then redeploy

### Clerk warnings or auth issues
Cause:
- wrong test/live keys for the deployed domain

Fix:
- use production Clerk keys matching the public domain

### Evolution requests fail
Check:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- network reachability
- webhook secret consistency

## Recommended operating workflow

1. Update code in Git
2. Push to GitHub
3. Redeploy from Dokploy
4. Check logs
5. Check `/api/health`
6. Validate Evolution status for at least one session

## Persistence

Do not remove these volumes unless you intentionally want data loss:
- `whappi-data`
- `whappi-sessions`
- `whappi-media`
