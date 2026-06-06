# Whappi → Evolution API Migration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Remplacer la gestion maison des sessions WhatsApp par Evolution API, tout en gardant Whappi comme couche produit/SaaS.

**Architecture cible:**
- Whappi = dashboard, auth, billing, tenants, crédits, orchestration métier
- Evolution API = moteur sessions WhatsApp, QR, connect/disconnect, send, inbound events
- Redis/BullMQ = orchestration jobs
- Postgres = données métier Whappi

---

## P0 — Décision d'architecture

### Whappi garde
- users
- plans
- crédits
- tenants
- permissions
- analytics produit
- modération métier
- webhooks sortants produit

### Evolution gère
- création d'instance WhatsApp
- QR / pairing
- état session
- envoi message
- réception événements WhatsApp
- médias WhatsApp

---

## P1 — Semaine 1 — Intégration minimale Evolution

### Objectif
Avoir Whappi qui pilote Evolution au lieu de parler à Baileys maison.

### Travaux
1. Ajouter config provider WhatsApp dans Whappi
   - `WHATSAPP_PROVIDER=evolution`
   - `EVOLUTION_API_URL`
   - `EVOLUTION_API_KEY`
2. Créer un client `src/services/providers/EvolutionApiClient.*`
3. Ajouter méthodes:
   - `createInstance`
   - `getQr`
   - `connectInstance`
   - `disconnectInstance`
   - `sendTextMessage`
   - `getInstanceStatus`
4. Ajouter couche d'abstraction provider:
   - `WhatsAppProvider interface`
   - implémentation `EvolutionProvider`
5. Router les flows dashboard/session vers ce provider

### Critère
- une session peut être créée
- QR récupéré
- session connectée
- message test envoyé

---

## P2 — Semaine 1 — Webhooks entrants Evolution

### Objectif
Recevoir les événements Evolution dans Whappi.

### Travaux
1. Créer endpoint webhook dédié Evolution
2. Vérifier signature / secret si dispo
3. Mapper événements entrants vers format interne Whappi
4. Persister:
   - statut session
   - qr refresh
   - message entrant
   - message envoyé
   - erreurs
5. Ajouter idempotency par event/message id

### Critère
- Whappi reçoit et traite correctement les events clés
- pas de double traitement

---

## P3 — Semaine 2 — Débrancher le runtime Baileys maison

### Objectif
Retirer progressivement `src/services/whatsapp.js` des chemins critiques.

### Travaux
1. identifier tous les appels directs à la logique Baileys actuelle
2. les remplacer par la couche provider
3. isoler les morceaux encore utiles métier
4. désactiver la gestion socket locale pour les nouveaux comptes
5. garder fallback temporaire si nécessaire

### Critère
- nouveaux comptes passent uniquement par Evolution
- plus de dépendance critique au process socket local

---

## P4 — Semaine 2 à 3 — Redis/BullMQ côté Whappi

### Objectif
Ne pas faire reposer l'orchestration sur HTTP synchrone simple.

### Travaux
1. BullMQ pour jobs d'envoi
2. retries contrôlés
3. DLQ
4. rate limit par tenant / session / user
5. queue webhooks entrants si burst

### Critère
- bursts absorbés sans casser l'API
- retries propres

---

## P5 — Semaine 3 à 4 — Postgres côté Whappi

### Objectif
Sortir SQLite des données métier.

### Tables prioritaires
- users
- whatsapp_sessions
- credits
- credit_history
- inbound_events
- outbound_messages
- webhooks
- activity_logs

### Critère
- Whappi multi-instance safe
- plus de contention SQLite

---

## P6 — Observabilité

### Ajouter
- logs JSON
- métriques send latency
- taux échec webhook
- backlog queue
- statut instances Evolution
- erreurs provider

---

## Risques / points à vérifier
1. limites exactes multi-instance côté Evolution
2. stratégie de nommage instance par tenant/user
3. gestion média et stockage
4. garanties idempotency des events
5. sécurité webhooks et API keys
6. stratégie si un client doit migrer plus tard vers Cloud API officiel

---

## Décision produit recommandée

### Standard
- moteur sessions = Evolution API

### Premium plus tard
- option provider = WhatsApp Cloud API officiel

Whappi devient multi-provider au lieu de rester couplé à Baileys maison.

---

## Premier epic à coder maintenant

**Epic:** `Introduce WhatsApp provider abstraction and Evolution API adapter`

### Scope immédiat
- env config Evolution
- client API Evolution
- provider interface
- create session / get QR / status / send message
- webhook receiver
- mapping vers modèle interne

### Résultat attendu
Whappi parle à Evolution sans casser la couche SaaS.