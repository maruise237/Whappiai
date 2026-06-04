# Changelog - Super Light Web WhatsApp API

## [Unreleased] - 2026-02-01

### ✨ Nouvelles Fonctionnalités
- **Refonte UI complète**: Migration vers shadcn/ui (Next.js, Green+Neutral theme).
- **Support Média complet**: Ajout du support pour les messages Image, Vidéo, Audio et PTT dans l'interface et l'API.
- **Référence API Dynamique**: Les exemples cURL se mettent à jour en temps réel selon l'onglet de message sélectionné.

### 🐛 Corrections de Bugs
- **Désactivation Bot**: Correction du bug de désactivation permanente. L'IA se met désormais en pause temporaire pour un seul message lorsqu'une écriture ou une lecture est détectée, au lieu de se désactiver globalement dans la base de données.
- **Mots-clés Multiples**: Correction du système de détection des mots-clés pour supporter plusieurs entrées séparées par des virgules, points-virgules ou barres verticales. Amélioration de la robustesse de la recherche (insensible à la casse et support des caractères spéciaux).
- **Windows EPERM**: Ajout de mécanismes de retry (10-20 tentatives) pour la sauvegarde des sessions et des identifiants WhatsApp afin d'éviter les erreurs de verrouillage de fichiers sur Windows.
- **Sessions Doublons**: Suppression des routes en double pour `/api/v1/sessions` et centralisation de la logique.
- **Hydratation Next.js**: Correction des erreurs d'hydratation (mismatch) dans le layout et les dialogues.
- **WebSocket**: Correction de l'URL de connexion WebSocket pour utiliser le port correct (3001).
- **Login**: Amélioration de la gestion des erreurs de connexion et passage à `async/await` pour la sauvegarde de session admin.
- **Parsing de Données**: Correction du parsing des listes de sessions et de destinataires pour gérer les formats variés (Object vs Array).

### 🔧 Améliorations Techniques
- **Centralisation API**: Utilisation d'un client API unique (`api.ts`) avec gestion globale des erreurs.
- **Performance**: Passage au `MemoryStore` pour Express Session afin de réduire les I/O disque sur Windows.
- **UX**: Amélioration de la réactivité mobile et de l'accessibilité clavier.
- **Clonage de Campagne**: Le clonage de campagne définit maintenant par défaut l'heure actuelle au lieu d'une valeur statique.
