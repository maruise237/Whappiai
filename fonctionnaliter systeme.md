# Stack Externe & Fonctionnalités Système - Whappi

Ce document répertorie toutes les fonctionnalités cœurs et les bibliothèques externes intégrées au projet pour enrichir l'expérience utilisateur (UX). Il sert de référence pour maintenir une cohérence fonctionnelle et visuelle lors de l'ajout de nouvelles pages ou options.

---

## 🎨 Intégration du Design System
Toutes les fonctionnalités et bibliothèques listées ici doivent impérativement puiser leurs informations de style (couleurs, rayons de bordure, polices) dans le fichier **[DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md)**.
- **Couleurs** : Utilisation des variables OKLCH (`var(--primary)`, `var(--card)`, etc.).
- **Thème** : Support natif du mode Clair et Sombre.

---

## 🚀 Fonctionnalités Cœurs du Système

### 📱 Gestion des Sessions WhatsApp
- **Description** : Création et gestion d'instances WhatsApp indépendantes via Baileys.
- **Fonctions** : Génération de QR Code en temps réel, monitoring de l'état de connexion (Connected, Connecting, Disconnected), et suppression sécurisée des données de session.

### 🤖 Module d'Automatisation IA (Agnostique)
- **Description** : Connexion de n'importe quel fournisseur d'IA (OpenAI, Groq, OpenRouter, Ollama) à une instance spécifique.
- **Modes de Réponse** :
  - **Bot** : Réponse 100% automatique.
  - **Humain** : L'IA génère des suggestions dans le dashboard pour envoi manuel.
  - **Hybride** : Réponse automatique avec un délai d'annulation pour intervention humaine.
- **Humanisation** : Simulation du statut "en train d'écrire" avec délai basé sur la longueur du texte.

### 👥 Gestion des Destinataires
- **Description** : Importation et organisation des contacts en listes segmentées.
- **Fonctions** : Support de l'importation massive et organisation pour un accès rapide.

###  Monitoring & Audit
- **Description** : Journalisation détaillée de toutes les actions système et erreurs.
- **Usage** : Debugging facilité et historique complet des interactions par session.

---

## 🛠️ Stack des Bibliothèques Externes

### 🗺️ Onboarding & Expérience Utilisateur
- **Outil** : `driver.js`
- **Usage** : Accompagner l'utilisateur via des tours guidés modulaires adaptés au contexte.
- **Zones Couvertes** :
  - **Dashboard** : Initialisation et connexion de session (QR Code).
  - **IA & Automatisation** : Configuration des prompts et des modèles.
  - **Modération de Groupe** (Audit 2024) : Guide pour la mise en place des règles et profils d'animation.
- **Cohérence** : Utilisation systématique de `popoverClass: 'driverjs-theme'` pour une intégration visuelle fluide.

### ⏳ Indicateurs de Progression
- **Outil** : `nprogress.js`
- **Usage** : Barre de progression subtile en haut de l'écran lors des changements de page ou d'appels API longs.
- **Référence Design** : Couleur fixée sur le vert WhatsApp (`#10b981`).

### 💬 Info-bulles & Tooltips (Standardisation)
- **Outil** : Shadcn/UI Tooltip (basé sur `Radix UI`)
- **Note Audit** : Migration effectuée de `tippy.js` vers Radix pour une meilleure accessibilité et intégration React.
- **Usage** : Explications contextuelles sur les icônes d'action, les statuts de session complexes, et les paramètres techniques (ex: Température IA).

### 🔔 Notifications & Alertes
- **Outil** : `sonner` (Toasts)
- **Usage** : Feedback immédiat pour les actions rapides (copie de texte, succès d'envoi).
- **Outil** : `sweetalert2` (Dialogues)
- **Usage** : Confirmations critiques (suppression) ou messages d'erreur bloquants.

### 🎊 Gamification & Feedback Positif
- **Outil** : `canvas-confetti`
- **Usage** : Célébrer des succès utilisateurs pour renforcer l'engagement.
- **Triggers Identifiés (Audit 2024)** :
  - **Connexion Session** : Succès de l'appairage QR Code/Code.
  - **Génération IA** : Création réussie d'un message d'animation de groupe complexe.

### 🔍 Coloration Syntaxique
- **Outil** : `prism.js`
- **Usage** : Rendre les logs et les exemples de code API lisibles et professionnels.

---

## 🔮 Fonctionnalités Prévues (Roadmap)
1. **Webhooks Sortants** : Notification en temps réel des systèmes tiers lors de la réception de messages.
2. **Statistiques Avancées** : Tableaux de bord analytiques pour les performances de l'IA.
3. **Multi-utilisateurs** : Système de rôles et permissions pour une gestion collaborative.
4. **Auto-répondeurs par Mots-clés** : Système de réponses automatiques basiques basé sur des déclencheurs textuels.

Pristine.js (Validation de formulaire sans stress)
Rien n'est pire qu'un formulaire qui renvoie une erreur après avoir cliqué sur "Envoyer".
Usage : Valide les numéros de téléphone ou les noms d'instances en temps réel pendant que l'utilisateur tape.
Bénéfice : Empêche l'erreur avant qu'elle n'arrive. C'est du JS pur et très léger.
Lien : Pristine.js
---

## 📝 Règles d'Implémentation Future
1. **Pas de doublons** : Avant d'ajouter une nouvelle bibliothèque, vérifiez si une bibliothèque de la stack actuelle ne peut pas remplir la fonction.
2. **Isolation des styles** : Préférez toujours l'utilisation des variables CSS du projet pour que la nouvelle fonctionnalité supporte le Dark Mode nativement.
3. **Performance** : N'importez les bibliothèques (comme Driver.js) que dans les composants "Client" qui en ont réellement besoin.
