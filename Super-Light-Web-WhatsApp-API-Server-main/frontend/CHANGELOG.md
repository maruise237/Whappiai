# Changelog - Super Light Web WhatsApp API Server

## [1.0.0] - 2024-05-21
### ✨ Refonte UI Complète avec shadcn/ui

#### 🚀 Framework & Architecture
- Migration vers **Next.js 14** (App Router).
- Initialisation de **shadcn/ui** (Style Vega, Thème Green + Neutral).
- Mise en place d'une couche de service API centralisée dans `src/lib/api.ts`.
- Configuration d'un proxy Next.js pour communiquer avec le backend Express.
- Intégration des **WebSockets** pour les mises à jour en temps réel (Sessions, Logs).

#### 📱 Interface Utilisateur (Responsive & Mobile-First)
- **Login**:
  - Nouvelle page de connexion sécurisée et esthétique.
  - Gestion des erreurs de connexion avec alertes visuelles.
- **Documentation API**:
  - Migration complète vers un format interactif avec navigation latérale.
  - Exemples cURL mis à jour avec support Audio/PTT et Vidéo.
  - Fonctionnalité de copie rapide pour les exemples de code.
- **Dashboard**: 
  - Cartes de session interactives avec états en temps réel.
  - Visualiseur de logs en temps réel via WebSockets.
  - Statistiques d'utilisation de l'API avec graphiques (Card stats).
  - Onglets (Tabs) pour l'envoi rapide de messages (Texte, Image, Vidéo, Audio/PTT, Document).
- **Campagnes**:
  - Nouveau sorcier (Wizard) de création de campagne en 4 étapes.
  - Gestion avancée des listes de destinataires (CRUD + Recherche).
  - Importation de contacts via fichiers CSV.
  - Planification des campagnes et gestion des délais.
  - Contrôle en temps réel (Démarrer, Pauser, Reprendre, Supprimer).
- **Activités & Logs**:
  - Historique complet des actions système.
  - Filtres par type d'action et statut.
  - Détails granulaires pour chaque transaction.
- **Gestion des Utilisateurs**:
  - Interface d'administration pour la gestion des comptes.
  - Contrôle des rôles (Admin/User) et des accès.

#### 🔧 Améliorations Techniques & Fixes
- **Service API**: Couche d'abstraction centralisée pour toutes les requêtes backend.
- **WebSockets**: Intégration pour une réactivité immédiate sans rafraîchissement.
- **Thème**: Support complet du mode sombre (Dark Mode) et clair (Light Mode).
- **Notifications**: Système de toasts (Sonner) pour un feedback utilisateur non intrusif.
- **Validation**: Utilisation de React state pour la validation des formulaires côté client.
- **Proxying**: Configuration de `next.config.ts` pour résoudre les problèmes de CORS en développement.
- **Fixes de Stabilité**:
  - Correction des imports manquants dans `layout.tsx` (useRouter, api).
  - Correction des erreurs de syntaxe dans le sorcier de campagne (`campaigns/page.tsx`).
  - Optimisation de la récupération des données avec `Promise.all`.
  - Nettoyage des composants UI en double dans le wizard.

#### 📝 Documentation
- Création de `DESIGN_SYSTEM.md` détaillant la charte graphique et les composants.
- Mise à jour de la documentation API avec les nouveaux types de médias supportés.
- Ce fichier `CHANGELOG.md` pour le suivi des versions.
