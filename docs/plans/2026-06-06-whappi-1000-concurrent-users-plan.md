# Whappi Plan Technique — 1000+ utilisateurs simultanés

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Amener Whappi vers une architecture capable de supporter 1000+ utilisateurs simultanés sans dépendre d'un process Node unique ni d'un stockage local fragile.

**Architecture cible:** Frontend + API stateless derrière Traefik, Redis pour état partagé et files, Postgres pour données métiers, workers WhatsApp séparés, pipeline événements asynchrone, observabilité complète.

**Hypothèse de dimensionnement:** 1000+ utilisateurs simultanés côté SaaS, avec montée progressive du nombre de sessions WhatsApp actives. Si la cible devient 1000 sessions WhatsApp actives simultanément, prévoir une phase d'orchestration workers encore plus poussée.

---

## Phase 0 — Semaine 1 — Stabiliser le socle

**Objectif:** supprimer les composants qui empêchent immédiatement le multi-instance.

### Livrables
1. Remplacer `session-file-store` par Redis.
2. Remplacer `sessionTokens = new Map()` par Redis.
3. Déplacer `activeQueues` de `src/services/QueueService.js` vers BullMQ/Redis.
4. Ajouter locks distribués par `sessionId`.
5. Ajouter rate limiting sérieux sur auth, webhooks, envois, admin.

### Fichiers ciblés
- `index.js`
- `src/routes/api/index.js`
- `src/services/QueueService.js`
- `src/routes/api/webhooks.js`
- `src/routes/api/messages.js`

### Résultat attendu
- 2 à 3 instances API possibles.
- Plus de perte de queue au restart.
- Sessions web et tokens partagés entre instances.

---

## Phase 1 — Semaine 2 à 3 — Séparer WhatsApp de l'API

**Objectif:** empêcher qu'un pic dashboard/API casse les sockets WhatsApp.

### Livrables
1. Créer un service `wa-worker` dédié.
2. Déplacer la logique principale de `src/services/whatsapp.js` dans ce worker.
3. Définir un contrat de jobs: `connect_session`, `disconnect_session`, `send_message`, `refresh_qr`, `sync_groups`.
4. Publier des événements worker: `session_connected`, `session_disconnected`, `qr_generated`, `message_received`, `message_sent`.
5. Faire de l'API un orchestrateur stateless.

### Résultat attendu
- Redémarrer l'API ne casse plus les sessions WhatsApp.
- Scaler API et workers séparément.
- Isoler les crashs/fuites mémoire.

---

## Phase 2 — Semaine 3 à 5 — Migrer SQLite vers Postgres

**Objectif:** retirer le writer unique et fiabiliser les transactions métier.

### Livrables
1. Introduire une couche repository.
2. Migrer `users`, `whatsapp_sessions`, `credit_history`, `activity_logs`, `group_settings`, `webhooks`.
3. Ajouter migrations formelles.
4. Ajouter index métier et stratégie de pagination.
5. Préparer partitionnement futur des `activity_logs`.

### Résultat attendu
- Plus de contention SQLite.
- Crédits et logs fiables sous charge.
- Base compatible multi-instance réel.

---

## Phase 3 — Semaine 5 à 6 — Sortir le hot path du synchrone

**Objectif:** réduire le coût par message et lisser les pics.

### Livrables
1. Rendre `ActivityLog` asynchrone avec batching.
2. Ajouter idempotency keys pour les envois et débits crédit.
3. Ajouter outbox pattern.
4. Ajouter dead-letter queues.
5. Rendre webhooks et analytics non bloquants.

### Résultat attendu
- Envoi message non bloqué par logs/analytics.
- Retry sûr sans double débit.
- Meilleure résilience aux bursts.

---

## Phase 4 — Semaine 6 à 7 — Découpler IA et modération non critique

**Objectif:** protéger le worker WhatsApp du coût IA.

### Livrables
1. Définir inline vs async.
2. Émettre `message_ingested` depuis le worker.
3. Créer consumers séparés pour IA, analytics, notifications.
4. Ajouter circuit breaker et rate limits provider IA.

### Résultat attendu
- IA lente n'impacte plus les messages entrants critiques.
- Worker WhatsApp garde une latence prévisible.

---

## Phase 5 — Semaine 7 à 8 — Observabilité et tests de charge

**Objectif:** mesurer si l'architecture tient vraiment 1000+ simultanés.

### Livrables
1. Métriques Prometheus/Grafana.
2. Sentry.
3. Logs JSON structurés.
4. Dashboards: sessions connectées, queue depth, p95 latence, mémoire Redis, slow queries Postgres.
5. Scénarios de load test: dashboard, webhooks, envois, burst messages.

### Résultat attendu
- Capacité mesurée, pas supposée.
- Alertes sur backlog, crash loop, reconnect storm.

---

## Capacité visée après refacto

### Après Phase 0
- 2–3 instances API.
- stabilité nettement meilleure.
- pas encore 1000+ simultanés réels.

### Après Phase 1 + 2
- base sérieuse pour croissance commerciale.
- API scalable.
- workers WhatsApp isolés.
- 1000+ simultanés deviennent plausibles selon nombre réel de sessions actives.

### Après Phase 3 + 4 + 5
- architecture prête pour vraie montée de charge.
- meilleure résilience aux pics, retries, providers lents.

---

## Go / No-Go

### No-Go actuel
- Garder SQLite.
- Garder `session-file-store`.
- Garder queues et tokens critiques en mémoire locale.
- Garder API + Baileys + IA dans un seul process.

### Go recommandé
- Redis maintenant.
- Worker WhatsApp ensuite.
- Postgres juste après.
- Observabilité avant ouverture large.

---

## Premier epic recommandé

**"Rendre Whappi multi-instance safe et préparer 1000+ simultanés"**

### Scope immédiat
- Redis session store
- Redis token store
- BullMQ queues
- distributed locks
- rate limiting durci
- instrumentation minimale

### Critère de sortie
- plusieurs instances API derrière Traefik
- aucun état critique perdu sur redéploiement
- base prête pour extraction du worker WhatsApp
