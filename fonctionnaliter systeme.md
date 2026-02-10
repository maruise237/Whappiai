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
- **Filtrage Intelligent** : Les administrateurs ne voient par défaut que leurs propres sessions, avec possibilité d'afficher toutes les sessions via paramètre global.

### 🤖 Module d'Automatisation IA (Agnostique)
- **Description** : Connexion de n'importe quel fournisseur d'IA (OpenAI, Groq, OpenRouter, Ollama) à une instance spécifique.
- **Modes de Réponse** :
  - **Bot** : Réponse 100% automatique avec formatage intelligent pour WhatsApp (Markdown vers syntaxe WA).
  - **Suggestion** : L'IA génère des réponses dans le dashboard pour envoi manuel par l'humain.
  - **Animation de Groupe** : Génération de messages engageants basés sur le profil du groupe (mission, objectifs, règles) et intégration de liens produits/CTA.
- **Humanisation** : Simulation réaliste du statut "en train d'écrire" avec un délai proportionnel à la longueur du texte généré.

### 📊 Gestion des Campagnes & Marketing
- **Description** : Envoi massif de messages personnalisés à des listes de contacts.
- **Options** : Délais aléatoires paramétrables entre les messages (stratégie anti-ban), planification différée via file d'attente, et support multi-médias (images, documents, audio/PTT, vidéos).
- **Suivi** : Monitoring de la progression en temps réel avec statistiques détaillées (envoyés, échoués, en attente).

### 👥 Gestion des Destinataires
- **Description** : Importation (CSV/Excel) et organisation des contacts en listes segmentées.
- **Fonctions** : Support complet des champs personnalisés (Custom Fields) pour une personnalisation dynamique des messages via des variables type `{{Name}}`, `{{Company}}`, etc.

### 📜 Monitoring & Audit
- **Description** : Journalisation détaillée de toutes les actions système et erreurs.
- **Usage** : Debugging facilité et historique complet des interactions par session.

---

## 🛠️ Stack des Bibliothèques Externes

### 🗺️ Onboarding (Tour Guidé)
- **Outil** : `driver.js`
- **Usage** : Accompagner l'utilisateur lors de sa première visite ou lors de l'ajout d'une section complexe.
- **Cohérence** : Le thème doit être injecté via `popoverClass: 'driverjs-theme'` pour correspondre au design minimaliste.

### ⏳ Indicateurs de Progression
- **Outil** : `nprogress.js`
- **Usage** : Barre de progression subtile en haut de l'écran lors des changements de page ou d'appels API longs.
- **Référence Design** : Couleur fixée sur le vert WhatsApp (`#10b981`).

### 💬 Info-bulles & Tooltips
- **Outil** : `tippy.js` (via `@tippyjs/react`)
- **Usage** : Explications contextuelles au survol des icônes ou des termes techniques.

### 🔔 Notifications & Alertes
- **Outil** : `sonner` (Toasts)
- **Usage** : Feedback immédiat pour les actions rapides (copie de texte, succès d'envoi, erreurs API).
- **Outil** : `sweetalert2` (Dialogues)
- **Usage** : Confirmations critiques (suppression de session/campagne) ou messages d'erreur bloquants avec support du thème sombre.

### 🎊 Gamification & Feedback Positif
- **Outil** : `canvas-confetti`
- **Usage** : Célébrer des étapes clés (ex: première connexion réussie d'une session).

### 🔍 Coloration Syntaxique
- **Outil** : `prism.js`
- **Usage** : Rendre les logs et les exemples de code API lisibles et professionnels.

---

## 🔮 Fonctionnalités Prévues (Roadmap)
1. **Webhooks Sortants** : Notification en temps réel des systèmes tiers lors de la réception de messages.
2. **Statistiques Avancées** : Tableaux de bord analytiques pour les campagnes et les performances de l'IA.
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
