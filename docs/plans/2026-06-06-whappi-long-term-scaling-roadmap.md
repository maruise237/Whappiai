# Whappi Long-Term Scaling Roadmap

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Faire passer Whappi d'une architecture mono-processus/SQLite à une architecture capable de supporter une forte croissance en sessions WhatsApp, messages et utilisateurs concurrents.

**Architecture:** Découpler API, workers WhatsApp, file d'événements et stockage. Sortir les états critiques du process Node unique (sessions actives, queues, tokens, logs) vers des services partagés. Remplacer les composants à contention forte (SQLite, file-store, Maps mémoire) par Postgres + Redis + workers dédiés.

**Tech Stack cible:** Node.js, Express, Postgres, Redis/BullMQ, workers WhatsApp dédiés, object storage pour médias, observabilité (Prometheus/Grafana/Sentry), load balancer reverse proxy.

---

## Constat codebase actuel

### Bottlenecks confirmés

1. **Single process**
   - `ecosystem.config.js:5-9` → `instances: 1`, `max_memory_restart: '1G'`
   - Toute la charge API + WhatsApp + IA + modération vit dans un seul process.

2. **SQLite synchrone**
   - `src/config/database.js:3,22-27` → `better-sqlite3` synchrone + WAL
   - WAL aide la concurrence lecture/écriture, mais il reste un seul writer effectif.

3. **État runtime en mémoire locale**
   - `src/services/whatsapp.js:34-39` → `activeSockets`, `retryCounters`, `reconnectTimeouts`, `lastQrs`
   - `src/services/QueueService.js:11` → `activeQueues`
   - `index.js:429` → `sessionTokens = new Map()`
   - Impossible à partager entre plusieurs instances API.

4. **Queue non persistée**
   - `src/services/QueueService.js:22-53` → queue en mémoire par session
   - `src/services/QueueService.js:81` → lecture DB à chaque message pour délais anti-ban
   - Perte de queue si crash/redeploy.

5. **Logging synchrone par message**
   - `src/models/ActivityLog.js:15-33` → INSERT synchrone
   - `src/models/ActivityLog.js:218-227` → `logMessageSend()` utilisé dans les flux d'envoi

6. **Débit artificiellement limité par session**
   - `src/services/QueueService.js:81-108` → délai 1-5s + typing + timeout 30s
   - C'est bon pour l'anti-ban, mais impose un worker/session propre à terme.

7. **Pipeline message dense et séquentiel**
   - `src/services/whatsapp.js:520-631`
   - Pour chaque message entrant: metadata groupe → modération → mots-clés → IA → webhooks
   - Tout se fait inline dans le même process.

8. **Express session file-store**
   - `index.js:141-155`
   - Mauvais fit pour plusieurs instances et pour montée en charge.

---

## Cible d'architecture long terme

### Topologie cible

- **API Gateway / Web app**
  - Auth, dashboard, CRUD sessions, lecture analytics
  - Stateless

- **WhatsApp Session Workers**
  - Un ou plusieurs workers dédiés aux sockets Baileys
  - Responsables des connexions, envois, présence, retry, anti-ban

- **Message Orchestrator / Queue**
  - Redis + BullMQ
  - Queue d'envoi par session
  - Queue d'événements entrants
  - Retry, DLQ, scheduling, backpressure

- **Postgres**
  - sessions, users, plans, usage, webhooks, moderation settings, analytics tables

- **Redis**
  - session tokens, rate limiters, locks, queues, cache de métadonnées, présence runtime

- **Object Storage**
  - médias uploadés, exports, pièces jointes

- **Analytics/Event Pipeline**
  - activité en append-only / batching
  - possible sink vers ClickHouse ou Postgres partitionné si volume élevé

---

## Phase 1 — Multi-instance safe foundation

### Objective
Retirer les points bloquants qui empêchent toute horizontalisation minimale.

### Work items

1. **Remplacer `session-file-store` par Redis store**
   - Modifier: `index.js`
   - But: plusieurs API instances derrière Traefik sans casser les sessions login.

2. **Remplacer `sessionTokens` Map par Redis**
   - Modifier: `index.js`, `src/routes/api/index.js`
   - API tokens deviennent partagés entre instances.

3. **Externaliser `activeQueues` vers BullMQ / Redis**
   - Modifier: `src/services/QueueService.js`
   - Une queue persistée par `sessionId`.

4. **Créer un lock distribué par session**
   - Remplacer `processing:${sessionId}` en mémoire
   - Éviter deux workers qui consomment la même session.

5. **Remplacer cache runtime non critique par Redis**
   - `lastQrs`, `retryCounters`, metadata groupe cache

### Success criteria
- 2 instances API possibles sans perte de session login
- redéploiement sans perdre les messages en attente
- tokens API valides depuis n'importe quelle instance

---

## Phase 2 — Sortir WhatsApp du process API

### Objective
Séparer les sockets Baileys du serveur web.

### Why
Aujourd'hui, `whatsapp.js` vit dans le même process que l'API. Un spike API ou une fuite mémoire IA peut tuer les connexions WhatsApp.

### Work items

1. **Créer un service `wa-worker` dédié**
   - Déplacer logique de `src/services/whatsapp.js`
   - Exposer commandes via Redis queue ou RPC interne

2. **Créer un contrat de commandes**
   - `connect_session`
   - `disconnect_session`
   - `send_message`
   - `refresh_qr`
   - `fetch_groups`

3. **Publier les événements de worker**
   - `session_connected`
   - `session_disconnected`
   - `qr_generated`
   - `message_received`
   - `message_sent`

4. **Transformer l'API en orchestrateur stateless**
   - API écrit dans Postgres/Redis
   - worker exécute
   - dashboard lit état consolidé depuis DB/cache

### Success criteria
- restart API sans casser les sessions WhatsApp connectées
- crash worker isolé sans faire tomber le dashboard
- possibilité de scaler API et workers séparément

---

## Phase 3 — Remplacer SQLite par Postgres

### Objective
Retirer le writer unique et permettre un volume plus élevé d'écritures.

### Why
Le code actuel utilise `better-sqlite3` sync partout:
- `src/config/database.js`
- `src/models/ActivityLog.js`
- `src/services/CreditService.js`
- `src/services/AccountAccessService.js`

### Migration strategy

1. **Introduire une couche repository**
   - Ne plus appeler `db.prepare()` directement partout
   - Créer `UserRepo`, `SessionRepo`, `CreditRepo`, `ActivityRepo`

2. **Porter d'abord les tables critiques**
   - `users`
   - `whatsapp_sessions`
   - `credit_history`
   - `activity_logs`
   - `group_settings`
   - `webhooks`

3. **Garder lecture duale temporaire si besoin**
   - migration progressive

4. **Ajouter migrations formelles**
   - Prisma / Knex / Drizzle / node-pg-migrate

### Postgres priorities
- index sur `owner_email`, `status`, `created_at`
- partitionnement `activity_logs` par mois si volume important
- transactions pour crédits + remboursements

### Success criteria
- plus de contention writer SQLite
- analytics et crédit supportent forte concurrence
- multi-instance sans fichier DB partagé fragile

---

## Phase 4 — Event pipeline & batching

### Objective
Réduire le coût par message et lisser les pics.

### Current pain points
- `ActivityLog.log()` synchrone à chaud
- `CreditService.deduct()` sync inline avant chaque envoi
- pipeline inline sur `messages.upsert`

### Work items

1. **Batch async pour `activity_logs`**
   - buffer mémoire court + flush Redis/Postgres toutes les X secondes ou X événements
   - fallback flush on shutdown

2. **Idempotency keys pour envois**
   - éviter double déduction crédit en retry

3. **Outbox pattern pour événements métier**
   - `message_sent`, `credit_debited`, `webhook_dispatched`

4. **Dead-letter queue**
   - webhooks échoués
   - envois impossibles
   - erreurs IA temporaires

### Success criteria
- envoi message non bloqué par analytics
- retry sûr sans double débit
- traçabilité des échecs

---

## Phase 5 — IA/modération découplées du temps réel critique

### Objective
Réduire la latence et protéger le worker WhatsApp.

### Current hot path
`src/services/whatsapp.js:593-631`
- modération
- mots-clés
- IA
- webhooks

### Work items

1. **Définir ce qui reste inline vs async**
   - inline: actions anti-spam critiques, suppression message, kick
   - async court: génération IA, analytics, webhooks non critiques

2. **Créer un `message_ingested` event**
   - worker publie un événement brut
   - consumers spécialisés traitent IA / analytics / notifications

3. **Créer un service IA dédié**
   - rate limit provider
   - cache prompts / responses si utile
   - retries et circuit breaker

### Success criteria
- un message entrant n'est plus bloqué par un provider IA lent
- la modération critique reste immédiate

---

## Phase 6 — Observabilité & SRE

### Objective
Piloter la croissance avec des métriques réelles.

### Add metrics
- sessions connectées
- RAM par worker
- queue depth par session
- send latency p50/p95/p99
- webhook failure rate
- AI latency p50/p95
- Postgres slow queries
- Redis memory / evictions

### Tooling
- Prometheus + Grafana
- Sentry
- structured logs JSON
- uptime checks

### Alerts
- queue depth > seuil
- worker crash loop
- reconnect storm
- high credit transaction failure rate
- webhook backlog growing

---

## Capacité cible par phase

### Aujourd'hui
- API + WA + IA sur 1 process
- viable surtout pour petit volume
- scaling horizontal pratiquement bloqué

### Après phase 1
- 2–3 instances API possibles
- queues persistées
- meilleure résilience deploy/crash

### Après phase 2 + 3
- scale API indépendamment des workers WA
- scale workers par lot de sessions
- support sérieux de croissance commerciale

### Après phase 4 + 5
- pipeline résistant aux bursts
- coûts par message mieux maîtrisés
- analytics et IA non bloquants

---

## Ordre recommandé d'exécution

1. Redis pour sessions/tokens/queues
2. Worker WhatsApp séparé
3. Postgres
4. batching logs + outbox + idempotency
5. service IA séparé
6. observabilité complète

---

## Décisions techniques recommandées

- **Redis/BullMQ** pour queues et locks
- **Postgres** pour données métiers
- **Un worker WhatsApp par groupe de sessions**, pas un seul monolithe global
- **Stateless API** derrière Traefik
- **Object storage** pour médias si volume croît
- **Partitionnement des logs** dès que les analytics deviennent produit central

---

## Non-goals immédiats

- Pas besoin de Kubernetes maintenant
- Pas besoin de microservices partout dès le jour 1
- Pas besoin de CQRS complexe avant d'avoir Redis + Postgres + workers séparés

---

## First implementation epic

**Epic recommandé:**
"Make Whappi multi-instance safe without changing product behavior"

### Scope
- Redis session store
- Redis token store
- BullMQ outbound queue
- distributed locks by session
- remove in-memory-only critical state where possible

### Expected outcome
- base solide pour ensuite sortir Baileys dans un worker dédié
- moins de risque avant ouverture commerciale plus large
