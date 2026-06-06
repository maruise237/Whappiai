# Whappi

Whappi is a SaaS layer for WhatsApp operations: dashboard, auth, billing, moderation, credits, and automation.

## Current architecture

- **App layer**: Whappi
- **WhatsApp engine**: Evolution API
- **Frontend / backend runtime**: Node.js + Next.js app container
- **Persistence**: SQLite volume
- **Deployment target**: Dokploy + Traefik on a Linux VPS

Whappi is no longer documented here as a Baileys-first deployment. The production path in this repo is **Evolution API provider mode**.

## Main features

- Multi-session WhatsApp management
- Dashboard and SaaS administration
- REST endpoints and webhooks
- AI-assisted flows
- Group engagement and moderation tools
- Dokploy-ready deployment

## Quick start

### 1. Clone
```bash
git clone git@github.com:maruise237/Whappiai.git
cd Whappiai
```

### 2. Configure env
```bash
cp .env.example .env
```

Then fill the required variables.

Most important:
- `TOKEN_ENCRYPTION_KEY`
- `SESSION_SECRET`
- Clerk keys
- `WHATSAPP_PROVIDER=evolution`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`

If you do **not** have Redis deployed, keep:
```env
REDIS_URL=
```

### 3. Run with Docker Compose
```bash
docker compose up -d --build
```

### 4. Health check
```bash
curl -sS http://localhost:3000/api/health
```

## Production deployment

See:
- `README-DEPLOY.md`
- `.env.example`

## Notes

- `TOKEN_ENCRYPTION_KEY` must stay stable after production data exists
- Redis is optional; a fake `REDIS_URL` creates noisy timeout logs
- Evolution API must be reachable from the app container

## License
MIT
