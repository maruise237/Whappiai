# src/services/providers/ — WhatsApp Provider Abstraction

## Purpose

Couche d'abstraction entre Whappi et les providers WhatsApp (Evolution API, Baileys). Permet de changer de provider sans impacter le reste du code.

## Ownership

- `WhatsAppProvider.js` — interface/classe de base
- `EvolutionApiProvider.js` — implémentation Evolution API (production)
- `BaileysProvider.js` ou équivalent — implémentation Baileys directe (dev legacy)
- `index.js` — factory / registry des providers

## Local Contracts

- **Tout appel WhatsApp passe par un provider.** Aucun code hors de ce dossier n'appelle Evolution API ou Baileys directement.
- **Interface commune** : chaque provider expose au minimum :
  - `sendMessage(to, content)` — envoyer un message texte
  - `sendMedia(to, media, caption?)` — envoyer média
  - `getInstanceStatus(instanceId?)` — statut de connexion
  - `createInstance(instanceId?)` — créer nouvelle instance
  - `logoutInstance(instanceId?)` — déconnecter
  - `onWebhook(event, handler)` — recevoir events entrants
- Provider actif défini par `WHATSAPP_PROVIDER` dans `.env` (`evolution` ou `baileys`)
- Toute nouvelle implémentation doit passer les mêmes tests que l'existante
- **Résilience Evolution API** (`EvolutionApiProvider.js`) :
  - Cache TTL (défaut 5 min) sur `fetchGroups()` et `getStatus()`
  - En cas d'erreur réseau / API down, sert les dernières données en cache
  - Timeout 15s sur chaque requête fetch, 10s sur `_getInstanceToken`
  - Les réponses en cache sont marquées `cached: true` dans le retour
  - Surcharger le TTL via `EVOLUTION_CACHE_TTL_MS` (ms)
- **Health check** : `scripts/evolution-health-check.sh` tourne toutes les 2min en cron.
  Vérifie que Evolution API répond HTTP 200. Redémarre le conteneur Docker après 2 checks
  consécutifs échoués.

## Work Guidance

1. Pour ajouter un provider : créer le fichier, implémenter l'interface, ajouter dans `index.js`
2. Pour modifier l'interface : mettre à jour TOUTES les implémentations existantes + tests

## Verification

- Vérifier que `WHATSAPP_PROVIDER=evolution` et `WHATSAPP_PROVIDER=baileys` fonctionnent tous les deux
- Les tests d'intégration webhook couvrent le flux provider → routes

## Child DOX Index

*Aucun enfant. Ce dossier est une feuille DOX.*
