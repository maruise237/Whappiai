# Migration Modération Groupes → Evolution API (2026-06-07)

## Problème
Le dashboard modération (anti-liens, mots interdits, avertissements, exclusion) ne fonctionnait pas en mode Evolution API car tout passait par le socket Baileys (`sessionData.sock`). En mode Evolution, `sock` n'existe pas.

## Correctifs appliqués

### 1. EvolutionApiProvider — 2 nouveaux endpoints

| Méthode | Endpoint Evolution | Usage |
|---|---|---|
| `deleteMessage(instanceId, { id, remoteJid, fromMe })` | `DELETE /chat/deleteMessageForEveryone/{name}` | Supprimer un message (anti-liens) |
| `groupUpdateParticipant(instanceId, { groupJid, action, participants })` | `POST /group/updateParticipant/{name}` | Kick (action: 'remove'), promote, demote |

### 2. WhatsAppProvider interface — `fetchGroups()`

### 3. SessionService — bridge methods
- `deleteMessageProvider(sessionId, msg)`
- `groupUpdateParticipantProvider(sessionId, opts)`

### 4. moderation.js — `handleIncomingMessageProvider()`
Nouvelle fonction **sans Baileys** qui :
1. Vérifie `group_settings` (anti_link, bad_words)
2. Supprime le message via `provider.deleteMessage()`
3. Envoie avertissement via `provider.sendTextMessage()`
4. Incrémente les warnings en DB locale
5. Kick via `provider.groupUpdateParticipant()` si seuil atteint

### 5. EvolutionWebhookHandler.js — Dispatch MESSAGES_UPSERT
Les messages entrants sont maintenant dispatchés vers `handleIncomingMessageProvider()`.

### 6. routes/api.js — Fix garde et filtrage
- Guard `!sessionData.sock` remplacé par `sessionData.status !== 'CONNECTED'`
- Groups filtrés : seulement ceux où l'owner JID est admin/superadmin
- `getSessionsDetails` awaité (bug async manquant)

## Endpoints Evolution découverts

### DELETE /chat/deleteMessageForEveryone/{instanceName}
**Body:** (champs à la racine, PAS dans `key`)
```json
{ "id": "messageId", "remoteJid": "group@g.us", "fromMe": false }
```

### POST /group/updateParticipant/{instanceName}
**Body:**
```json
{ "groupJid": "group@g.us", "action": "remove", "participants": ["jid@domain"] }
```
**Actions supportées:** `add`, `remove`, `promote`, `demote`

### GET /group/fetchAllGroups/{instanceName}?getParticipants=true
Retourne un **tableau direct** `[{id, subject, size, creation, owner, participants, ...}]`.

## Fichiers modifiés (commit 09334ec)
```
src/services/providers/WhatsAppProvider.js
src/services/providers/EvolutionApiProvider.js
src/services/SessionService.js
src/services/moderation.js
src/services/EvolutionWebhookHandler.js
src/routes/api.js
```

## Vérification

```bash
# 1. Vérifier que les groupes admin sont listés
# 2. Envoyer un lien dans un groupe Whappi → doit être supprimé
# 3. Vérifier les logs
sudo docker logs --tail 50 whappi-whappi-sypalq-whappi-frontend-1 2>&1 | grep -i "violation\|moderation"
```

## Reste à faire
- GROUPS_UPSERT → handleParticipantUpdate (welcome quotidien)
- Envoi média programmé (sendMedia)
