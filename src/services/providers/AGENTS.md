# src/services/providers/ - WhatsApp Provider Abstraction

## Purpose

Couche d'abstraction entre Whappi et le provider WhatsApp actif. Dans ce repo, le chemin supporte Evolution API en production et le legacy Baileys n'est plus maintenu.

## Ownership

- `WhatsAppProvider.js` - interface/classe de base
- `EvolutionApiProvider.js` - implementation Evolution API active
- `index.js` - factory / registry des providers

## Local Contracts

- **Tout appel WhatsApp passe par un provider.** Aucun code hors de ce dossier n'appelle Evolution API directement.
- **Interface commune** : chaque provider expose au minimum :
  - `sendMessage(to, content)` - envoyer un message texte
  - `sendMedia(to, media, caption?)` - envoyer media
  - `getInstanceStatus(instanceId?)` - statut de connexion
  - `createInstance(instanceId?)` - creer nouvelle instance
  - `logoutInstance(instanceId?)` - deconnecter
  - `onWebhook(event, handler)` - recevoir events entrants
- Provider actif defini par `WHATSAPP_PROVIDER` dans `.env` et doit rester `evolution`
- Toute nouvelle implementation doit passer les memes tests que l'existante
- **Resilience Evolution API** (`EvolutionApiProvider.js`) :
  - Cache TTL (defaut 5 min) sur `fetchGroups()` et `getStatus()`
  - En cas d'erreur reseau / API down, sert les dernieres donnees en cache
  - Timeout 15s sur chaque requete fetch, 10s sur `_getInstanceToken`
  - Les reponses en cache sont marquees `cached: true` dans le retour
  - Surcharger le TTL via `EVOLUTION_CACHE_TTL_MS` (ms)
- **Cache groupes PostgreSQL** (`GroupCacheService.js`) :
  - `getCachedGroups()` -> retourne les groupes depuis PostgreSQL en < 10ms
  - `refreshGroups()` -> refresh WhatsApp en arriere-plan
  - Donnees considerees stale apres 2 min -> refresh auto au prochain appel
  - Donnees expirees apres 10 min -> refresh force
  - Configurable via `GROUP_CACHE_STALE_MS` et `GROUP_CACHE_TTL_MS`
- **Health check** : `scripts/evolution-health-check.sh` peut verifier que Evolution API repond HTTP 200.

## Work Guidance

1. Pour ajouter un provider : creer le fichier, implementer l'interface, ajouter dans `index.js`
2. Pour modifier l'interface : mettre a jour toutes les implementations existantes + tests
3. Ne pas reintroduire de chemin runtime Baileys dans le serveur principal

## Verification

- Verifier que `WHATSAPP_PROVIDER=evolution` fonctionne et que le flux webhook/provider reste sain
- Les tests d'integration webhook couvrent le flux provider -> routes

## Child DOX Index

*Aucun enfant. Ce dossier est une feuille DOX.*
