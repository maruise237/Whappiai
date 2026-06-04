# CAHIER DES CHARGES - WHAPPI FINAL
## Automatisation WhatsApp No-Code pour Utilisateurs Non-Techniques

---

**Vision :** Whappi permet à ANYONE (sans compétences techniques) d'automatiser leur WhatsApp personnel ET leurs groupes grâce à l'IA.

**Date :** 5 février 2026  
**Méthodologie :** BMAD (Obligatoire)

---

## 🎯 VISION ULTRA-CLAIRE

### Ce que Whappi FAIT :
✅ **Automatiser les réponses** de votre numéro WhatsApp avec l'IA  
✅ **Gérer vos groupes WhatsApp** facilement  
✅ **Modérer automatiquement** vos groupes (spam, liens interdits, etc.)  
✅ **Messages de bienvenue** automatiques pour nouveaux membres  
✅ **Interface no-code** - ZÉRO terminal, ZÉRO ligne de code  
✅ **API publique** pour développeurs

### Ce que Whappi NE FAIT PAS :
❌ Campagnes marketing / envoi de masse à des inconnus  
❌ Statistiques complexes / analytics avancés  

---

## 📋 TABLE DES MATIÈRES

1. [Vision Produit](#1-vision-produit)
2. [Fonctionnalités Core](#2-fonctionnalités-core)
3. [Interface Utilisateur No-Code](#3-interface-utilisateur-no-code)
4. [API Publique](#4-api-publique-pour-développeurs)
5. [Architecture Technique](#5-architecture-technique)
6. [Plan BMAD](#6-plan-bmad)
7. [Livrables](#7-livrables)

---

## 1. VISION PRODUIT

### 1.1 Problème Résolu

**Persona 1 : Solopreneur (WhatsApp personnel)**
> "Je reçois 50 messages par jour avec les mêmes questions. Je veux une IA qui répond automatiquement."

**Persona 2 : Community Manager (Groupes WhatsApp)**
> "Je gère 5 groupes WhatsApp avec 500+ membres. Je passe ma vie à supprimer les spams et accueillir les nouveaux. Je veux automatiser tout ça."

**Solution Whappi :**
> "En 5 minutes, sans code, je connecte mon WhatsApp, je configure mon IA, et elle gère automatiquement mes conversations et mes groupes."

### 1.2 Différenciateurs

| Concurrent | Approche | Whappi |
|------------|----------|--------|
| **AiSensy** | WhatsApp Business API (complexe, cher) | WhatsApp personnel (simple, accessible) |
| **Wati** | $39/mois minimum | Gratuit pour commencer |
| **Landbot** | Flows complexes à construire | Configuration IA en langage naturel |

**Whappi = "WhatsApp automation pour ta grand-mère"**

### 1.3 Méthodologie BMAD

```bash
npx bmad-method install
```

**Documentation :** https://docs.bmad-method.org/

Workflow obligatoire : `/analyst` → `/pm` → `/architect` → `/sm` → `/dev` → `/qa`

---

## 2. FONCTIONNALITÉS CORE

### 2.1 Connexion WhatsApp (QR Code)

#### User Flow
```
1. Créer un compte (email/password)
2. Clic "Connecter WhatsApp"
3. Scanner le QR Code
4. ✅ Connecté !
```

#### Spécifications Techniques

**Backend :**
- Utiliser Baileys (`src/services/whatsapp.js` existant)
- 1 session par utilisateur (simple)

**Base de données :**
```sql
users (
  id,
  email,
  password_hash,
  whatsapp_number,
  whatsapp_status,  -- 'connected' | 'disconnected'
  created_at
)
```

---

### 2.2 Auto-Répondeur IA (Messages Privés)

#### User Flow
```
1. Aller dans "Mon IA"
2. Toggle ON/OFF
3. Écrire ce que l'IA doit faire (en français)
4. Tester
5. Activer
6. ✅ L'IA répond automatiquement !
```

#### Interface de Configuration

```
┌──────────────────────────────────────────────┐
│  🤖 Mon Assistant WhatsApp                   │
├──────────────────────────────────────────────┤
│                                               │
│  Activer l'IA           [●───] ON            │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Dis-moi ce que ton IA doit faire :      │ │
│  │                                          │ │
│  │ "Tu es mon assistant SAV. Tu réponds    │ │
│  │  aux questions sur :                     │ │
│  │  - Les horaires : 9h-19h du lundi au    │ │
│  │    vendredi                              │ │
│  │  - Les produits : voir le catalogue sur │ │
│  │    monsite.com                           │ │
│  │  - Les livraisons : 3-5 jours"          │ │
│  │                                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Modèle    [DeepSeek (Gratuit) ▼]           │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  💬 Tester                              │ │
│  │  Message : "Vous livrez ?"              │ │
│  │  [Envoyer]                               │ │
│  │                                          │ │
│  │  Réponse : "Oui ! Nos délais sont de..."│ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  [Sauvegarder]                               │
└──────────────────────────────────────────────┘
```

#### Spécifications Techniques

**Workflow :**
```javascript
whatsapp.on('message', async (msg) => {
  // Si message privé (pas dans un groupe)
  if (!msg.key.remoteJid.includes('@g.us')) {
    const user = await getUserByPhone(msg.key.remoteJid);
    
    if (user?.ai_enabled) {
      const response = await aiService.generate({
        systemPrompt: user.ai_prompt,
        userMessage: msg.message.conversation
      });
      
      await whatsapp.sendMessage(msg.key.remoteJid, { text: response });
    }
  }
});
```

**Base de données :**
```sql
users (
  ...
  ai_enabled BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_model VARCHAR DEFAULT 'deepseek-chat'
)
```

---

### 2.3 Gestion de Groupes

#### 2.3.1 Vue d'ensemble

**User Flow :**
```
1. Connecter WhatsApp
2. Whappi détecte automatiquement vos groupes
3. Choisir un groupe
4. Configurer l'automatisation
```

#### 2.3.2 Interface Groupes

```
┌──────────────────────────────────────────────┐
│  👥 Mes Groupes WhatsApp                     │
├──────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ 🏢 Groupe Support Clients               │ │
│  │ 156 membres                              │ │
│  │                                          │ │
│  │ ✅ Modération active                    │ │
│  │ ✅ Message de bienvenue                 │ │
│  │ ⚫ IA auto-réponse (désactivée)         │ │
│  │                                          │ │
│  │ [Configurer]                             │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ 👨‍👩‍👧 Famille                              │ │
│  │ 12 membres                               │ │
│  │                                          │ │
│  │ ⚫ Aucune automatisation                │ │
│  │                                          │ │
│  │ [Configurer]                             │ │
│  └─────────────────────────────────────────┘ │
│                                               │
└──────────────────────────────────────────────┘
```

#### 2.3.3 Spécifications Techniques

**Détection automatique des groupes :**
```javascript
async function syncUserGroups(userId) {
  const sock = getWhatsAppSocket(userId);
  
  // Récupérer tous les groupes
  const groups = await sock.groupFetchAllParticipating();
  
  // Sauvegarder en DB
  for (const [jid, group] of Object.entries(groups)) {
    await prisma.group.upsert({
      where: { jid },
      update: {
        name: group.subject,
        memberCount: group.participants.length
      },
      create: {
        userId,
        jid,
        name: group.subject,
        memberCount: group.participants.length
      }
    });
  }
}
```

**Base de données :**
```sql
groups (
  id,
  user_id,
  jid,                    -- WhatsApp Group ID
  name,
  member_count,
  
  -- Automatisations
  moderation_enabled BOOLEAN DEFAULT false,
  welcome_enabled BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT false,
  
  created_at
)
```

---

### 2.4 Modération Automatique

#### 2.4.1 Vue d'ensemble

**Objectif :** Supprimer automatiquement les messages indésirables dans les groupes.

#### 2.4.2 Interface de Configuration

```
┌──────────────────────────────────────────────┐
│  🛡️ Modération du groupe                     │
│  "Support Clients"                            │
├──────────────────────────────────────────────┤
│                                               │
│  Activer la modération    [●───] ON          │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Bloquer automatiquement :                │ │
│  │                                          │ │
│  │ ☑ Liens (URLs)                          │ │
│  │   Sauf : monsite.com, google.com        │ │
│  │   [Ajouter une exception]                │ │
│  │                                          │ │
│  │ ☑ Mots interdits                        │ │
│  │   spam, arnaque, promotion               │ │
│  │   [Ajouter un mot]                       │ │
│  │                                          │ │
│  │ ☑ Numéros étrangers                     │ │
│  │   Bloquer les +91, +234, +62            │ │
│  │   [Ajouter un indicatif]                 │ │
│  │                                          │ │
│  │ ☐ Messages trop longs (> 500 caractères)│ │
│  │                                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Action quand un message est détecté :       │
│  ● Supprimer le message                      │
│  ○ Avertir l'utilisateur                     │
│  ○ Bannir du groupe                          │
│                                               │
│  [Sauvegarder]                               │
└──────────────────────────────────────────────┘
```

#### 2.4.3 Spécifications Techniques

**Workflow de modération :**
```javascript
whatsapp.on('message', async (msg) => {
  // Si message dans un groupe
  if (msg.key.remoteJid.includes('@g.us')) {
    const groupConfig = await getGroupConfig(msg.key.remoteJid);
    
    if (groupConfig?.moderation_enabled) {
      const shouldBlock = await checkMessage(msg, groupConfig.rules);
      
      if (shouldBlock) {
        // Supprimer le message
        await whatsapp.sendMessage(msg.key.remoteJid, {
          delete: msg.key
        });
        
        // Logger
        await logModeration({
          groupId: groupConfig.id,
          messageContent: msg.message.conversation,
          reason: shouldBlock.reason
        });
        
        // Optionnel : Avertir
        if (groupConfig.warn_user) {
          await whatsapp.sendMessage(msg.key.participant, {
            text: "⚠️ Ton message a été supprimé car il ne respecte pas les règles du groupe."
          });
        }
      }
    }
  }
});

function checkMessage(msg, rules) {
  const text = msg.message.conversation || '';
  
  // Vérifier les liens
  if (rules.block_links) {
    const hasLink = /https?:\/\//.test(text);
    const isException = rules.allowed_domains?.some(domain => 
      text.includes(domain)
    );
    
    if (hasLink && !isException) {
      return { block: true, reason: 'link_detected' };
    }
  }
  
  // Vérifier les mots interdits
  if (rules.blacklist_words) {
    const hasBlockedWord = rules.blacklist_words.some(word =>
      text.toLowerCase().includes(word.toLowerCase())
    );
    
    if (hasBlockedWord) {
      return { block: true, reason: 'blocked_word' };
    }
  }
  
  // Vérifier numéros étrangers
  if (rules.block_foreign_numbers) {
    const senderNumber = msg.key.participant.split('@')[0];
    const isBlocked = rules.blocked_prefixes?.some(prefix =>
      senderNumber.startsWith(prefix)
    );
    
    if (isBlocked) {
      return { block: true, reason: 'foreign_number' };
    }
  }
  
  return null;
}
```

**Base de données :**
```sql
group_configs (
  id,
  group_id,
  
  -- Règles de modération (JSON)
  moderation_rules JSON,
  -- {
  --   block_links: true,
  --   allowed_domains: ['monsite.com'],
  --   blacklist_words: ['spam', 'arnaque'],
  --   blocked_prefixes: ['+91', '+234'],
  --   max_length: 500
  -- }
  
  action VARCHAR DEFAULT 'delete',  -- 'delete' | 'warn' | 'ban'
  warn_user BOOLEAN DEFAULT false
)

moderation_logs (
  id,
  group_id,
  sender_number,
  message_content,
  reason,              -- 'link_detected' | 'blocked_word' | 'foreign_number'
  action_taken,        -- 'deleted' | 'warned' | 'banned'
  timestamp
)
```

---

### 2.5 Messages de Bienvenue

#### 2.5.1 Vue d'ensemble

**Objectif :** Envoyer automatiquement un message personnalisé quand quelqu'un rejoint le groupe.

#### 2.5.2 Interface de Configuration

```
┌──────────────────────────────────────────────┐
│  👋 Message de Bienvenue                     │
│  "Support Clients"                            │
├──────────────────────────────────────────────┤
│                                               │
│  Activer    [●───] ON                        │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Message :                                │ │
│  │                                          │ │
│  │ Bienvenue {nom} ! 👋                    │ │
│  │                                          │ │
│  │ Tu es maintenant dans le groupe Support │ │
│  │ Clients.                                 │ │
│  │                                          │ │
│  │ Règles du groupe :                       │ │
│  │ - Pas de spam                            │ │
│  │ - Sois respectueux                       │ │
│  │ - Pas de liens externes                  │ │
│  │                                          │ │
│  │ Si tu as une question, pose-la ici !     │ │
│  │                                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Variables disponibles :                      │
│  {nom} - Nom du nouveau membre               │
│  {nombre} - Nombre total de membres          │
│                                               │
│  Aperçu :                                     │
│  "Bienvenue Marie ! 👋 Tu es maintenant..."  │
│                                               │
│  [Sauvegarder]                               │
└──────────────────────────────────────────────┘
```

#### 2.5.3 Spécifications Techniques

**Workflow :**
```javascript
whatsapp.on('group-participants.update', async (update) => {
  if (update.action === 'add') {
    const groupConfig = await getGroupConfig(update.id);
    
    if (groupConfig?.welcome_enabled) {
      // Pour chaque nouveau membre
      for (const participant of update.participants) {
        // Récupérer le nom
        const contact = await whatsapp.getContact(participant);
        const name = contact.name || contact.notify || participant.split('@')[0];
        
        // Personnaliser le message
        const message = groupConfig.welcome_message
          .replace('{nom}', name)
          .replace('{nombre}', update.participants.length);
        
        // Envoyer dans le groupe
        await whatsapp.sendMessage(update.id, {
          text: message,
          mentions: [participant]
        });
      }
    }
  }
});
```

**Base de données :**
```sql
group_configs (
  id,
  group_id,
  
  welcome_enabled BOOLEAN DEFAULT false,
  welcome_message TEXT
)
```

---

### 2.6 Auto-Répondeur IA dans les Groupes (Optionnel)

#### 2.6.1 Vue d'ensemble

**Cas d'usage :** L'IA peut répondre aux questions dans le groupe (comme un assistant).

#### 2.6.2 Interface de Configuration

```
┌──────────────────────────────────────────────┐
│  🤖 Assistant IA du Groupe                   │
│  "Support Clients"                            │
├──────────────────────────────────────────────┤
│                                               │
│  Activer l'IA dans ce groupe    [○───] OFF   │
│                                               │
│  ℹ️  L'IA répondra automatiquement aux       │
│     questions posées dans le groupe.          │
│                                               │
│  ⚠️  Attention : Peut générer beaucoup de    │
│     messages. À utiliser avec précaution.     │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Rôle de l'IA :                           │ │
│  │                                          │ │
│  │ "Tu es l'assistant du groupe Support    │ │
│  │  Clients. Tu réponds uniquement aux      │ │
│  │  questions techniques sur nos produits.  │ │
│  │  Si tu ne sais pas, dis 'Je transfère   │ │
│  │  à un humain'."                          │ │
│  │                                          │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Répondre uniquement si :                     │
│  ☑ Le message contient un "?"                │
│  ☑ Le message mentionne @bot ou @assistant   │
│  ☐ Tous les messages                         │
│                                               │
│  [Sauvegarder]                               │
└──────────────────────────────────────────────┘
```

#### 2.6.3 Spécifications Techniques

**Workflow :**
```javascript
whatsapp.on('message', async (msg) => {
  if (msg.key.remoteJid.includes('@g.us')) {
    const groupConfig = await getGroupConfig(msg.key.remoteJid);
    
    if (groupConfig?.ai_enabled) {
      const text = msg.message.conversation || '';
      
      // Vérifier si on doit répondre
      const shouldRespond = 
        (groupConfig.ai_trigger === 'question' && text.includes('?')) ||
        (groupConfig.ai_trigger === 'mention' && text.includes('@bot')) ||
        (groupConfig.ai_trigger === 'all');
      
      if (shouldRespond) {
        const response = await aiService.generate({
          systemPrompt: groupConfig.ai_prompt,
          userMessage: text
        });
        
        await whatsapp.sendMessage(msg.key.remoteJid, {
          text: response,
          quoted: msg  // Répondre au message
        });
      }
    }
  }
});
```

**Base de données :**
```sql
group_configs (
  id,
  group_id,
  
  ai_enabled BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  ai_trigger VARCHAR DEFAULT 'question'  -- 'question' | 'mention' | 'all'
)
```

---

## 3. INTERFACE UTILISATEUR NO-CODE

### 3.1 Pages de l'Application

```
┌────────────────────────────────────┐
│  1. /login                         │
│  2. /signup                        │
│  3. /dashboard                     │ ← Vue d'ensemble
│  4. /connect                       │ ← QR Code
│  5. /ai                            │ ← Config IA (messages privés)
│  6. /groups                        │ ← Liste des groupes
│  7. /groups/[id]                   │ ← Config d'un groupe
│  8. /settings                      │ ← Paramètres
│  9. /api                           │ ← Documentation API
└────────────────────────────────────┘
```

### 3.2 Dashboard Principal

```
┌─────────────────────────────────────────────────┐
│  Whappi                          [Paramètres ⚙] │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ 📱 WhatsApp      │  │ 🤖 IA Messages   │    │
│  │                  │  │                  │    │
│  │ ✅ Connecté      │  │ ● Activée        │    │
│  │ +33 6 12 34...   │  │ 28 réponses      │    │
│  │                  │  │ aujourd'hui      │    │
│  │ [Déconnecter]    │  │ [Configurer]     │    │
│  └──────────────────┘  └──────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 👥 Mes Groupes (3)                        │  │
│  │                                            │  │
│  │ 🏢 Support Clients                        │  │
│  │    ✅ Modération  ✅ Bienvenue  ⚫ IA      │  │
│  │    [Gérer]                                 │  │
│  │                                            │  │
│  │ 💼 Équipe Marketing                       │  │
│  │    ⚫ Aucune automatisation                │  │
│  │    [Configurer]                            │  │
│  │                                            │  │
│  │ [Voir tous les groupes]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.3 Page Configuration Groupe

```
┌─────────────────────────────────────────────────┐
│  ← Retour        Groupe : Support Clients       │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Informations                                │
│  Nom : Support Clients                          │
│  Membres : 156                                   │
│  Créé le : 15 janvier 2026                      │
│                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  🛡️ Modération Automatique                     │
│  [●───] Activée                                 │
│  [Configurer les règles]                        │
│                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  👋 Message de Bienvenue                        │
│  [●───] Activé                                  │
│  [Modifier le message]                          │
│                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                  │
│  🤖 Assistant IA                                │
│  [○───] Désactivé                               │
│  [Configurer l'IA]                              │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.4 Règles de Design

**Interdit :**
- Commandes terminal
- JSON/YAML visible
- Messages d'erreur techniques
- Logs bruts

**Obligatoire :**
- Boutons clairs
- Toggles simples
- Messages en français
- Previews visuels

---

## 4. API PUBLIQUE POUR DÉVELOPPEURS

### 4.1 Endpoints

#### **POST /api/v1/messages/send**
Envoyer un message.

```bash
curl -X POST https://api.whappi.io/v1/messages/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "to": "+33612345678",
    "message": "Bonjour !"
  }'
```

#### **GET /api/v1/groups**
Liste des groupes.

```bash
curl https://api.whappi.io/v1/groups \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Réponse :**
```json
{
  "groups": [
    {
      "id": "grp_abc123",
      "name": "Support Clients",
      "memberCount": 156,
      "moderationEnabled": true,
      "welcomeEnabled": true
    }
  ]
}
```

#### **POST /api/v1/groups/:id/config**
Configurer un groupe.

```bash
curl -X POST https://api.whappi.io/v1/groups/grp_abc123/config \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "moderationEnabled": true,
    "moderationRules": {
      "blockLinks": true,
      "blacklistWords": ["spam", "promo"]
    },
    "welcomeMessage": "Bienvenue {nom} !"
  }'
```

---

## 5. ARCHITECTURE TECHNIQUE

### 5.1 Stack (Garder l'existant)

- Node.js + Express
- SQLite (simple)
- Baileys (WhatsApp)
- Next.js 15 + React 19
- Tailwind + Shadcn/UI

### 5.2 Base de Données Simplifiée

```sql
-- Utilisateurs
users (
  id,
  email,
  password_hash,
  whatsapp_number,
  whatsapp_status,
  ai_enabled,
  ai_prompt,
  api_key,
  created_at
)

-- Groupes
groups (
  id,
  user_id,
  jid,
  name,
  member_count,
  created_at
)

-- Configuration des groupes
group_configs (
  id,
  group_id,
  
  -- Modération
  moderation_enabled BOOLEAN,
  moderation_rules JSON,
  moderation_action VARCHAR,
  
  -- Bienvenue
  welcome_enabled BOOLEAN,
  welcome_message TEXT,
  
  -- IA
  ai_enabled BOOLEAN,
  ai_prompt TEXT,
  ai_trigger VARCHAR
)

-- Logs modération
moderation_logs (
  id,
  group_id,
  sender_number,
  message_content,
  reason,
  action_taken,
  timestamp
)
```

### 5.3 Workflow Global

```
Message WhatsApp reçu
         ↓
    Est-ce un groupe ?
         ↓
    ┌────┴────┐
    │         │
   OUI       NON
    │         │
    │         ↓
    │    IA activée ?
    │         ↓
    │    Répondre
    │
    ↓
Modération activée ?
    ↓
 Vérifier règles
    ↓
Bloquer si nécessaire
    ↓
IA groupe activée ?
    ↓
Répondre si trigger
```

---

## 6. PLAN BMAD

### 6.1 Installation

```bash
npx bmad-method install
```

### 6.2 Workflow

#### Phase 1 : Planning (Semaine 1)

**Analyst**
```bash
/analyst
```

Créer Product Brief pour :
- Messages privés + IA
- Gestion groupes
- Modération automatique
- Messages bienvenue
- API publique

**PM**
```bash
/pm
```

PRD avec User Stories pour chaque feature.

**Architect**
```bash
/architect
```

Architecture simple (garder SQLite).

#### Phase 2 : Development (Semaines 2-4)

**Scrum Master**
```bash
/sm
```

**Epics :**
1. Connexion WhatsApp + IA Messages Privés
2. Gestion Groupes + Détection Auto
3. Modération Automatique
4. Messages de Bienvenue
5. API Publique

**Developer**
```bash
/dev
```

Développement story par story.

**QA**
```bash
/qa
```

Tests pour chaque epic.

### 6.3 Timeline

```
Semaine 1 : Planning BMAD
Semaine 2 : Epic 1 & 2
Semaine 3 : Epic 3 & 4
Semaine 4 : Epic 5 + Tests + Déploiement

Total : 4 semaines
```

---

## 7. LIVRABLES

### 7.1 Code Source

```
whappi/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── connect/
│   │   ├── ai/
│   │   ├── groups/
│   │   │   └── [id]/
│   │   └── api/v1/
│   ├── components/
│   │   ├── QRCode.tsx
│   │   ├── AIConfig.tsx
│   │   ├── GroupList.tsx
│   │   ├── ModerationConfig.tsx
│   │   └── WelcomeConfig.tsx
│   ├── services/
│   │   ├── whatsapp.js
│   │   ├── ai.js
│   │   └── moderation.js
│   └── lib/
│       └── db.js
└── data/
    └── whappi.db
```

### 7.2 Documentation

- Product Brief (Analyst)
- PRD (PM)
- Architecture (Architect)
- Stories (SM)
- API Documentation
- Guide utilisateur

### 7.3 Tests

- Coverage > 80%
- Tests E2E sur interface no-code
- Tests API complets

---

## ✅ CHECKLIST FINALE

```
Vision
□ Focus clair (WhatsApp + Groupes + IA)
□ Interface no-code
□ API pour devs

Fonctionnalités
□ Connexion WhatsApp (QR)
□ Auto-répondeur IA (messages privés)
□ Gestion groupes (détection auto)
□ Modération automatique
□ Messages de bienvenue
□ IA dans groupes (optionnel)
□ API publique

BMAD
□ Product Brief (Analyst)
□ PRD (PM)
□ Architecture (Architect)
□ Stories (SM)
□ Code (Dev)
□ Tests (QA)

Technique
□ Stack existant préservé
□ SQLite (simple)
□ Interface grand public
```

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Vision
> **Whappi = Automatiser WhatsApp sans code**

### Fonctionnalités Core
1. ✅ Auto-répondeur IA (messages privés)
2. ✅ Gestion de groupes
3. ✅ Modération automatique
4. ✅ Messages de bienvenue
5. ✅ API pour développeurs

### Exclusions
- ❌ Campagnes marketing de masse
- ❌ Analytics complexes

### Timeline
- **4 semaines** avec BMAD
- **5 epics** bien définis

---

**Ce cahier des charges est prêt ! 🚀**

**Prochaine étape :**
```bash
npx bmad-method install
/analyst
```
