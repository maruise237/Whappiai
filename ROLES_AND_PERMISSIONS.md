# Documentation des Rôles et Permissions - Whappi

Ce document détaille le système de gestion des accès (RBAC) implémenté dans Whappi.

## 1. Vue d'ensemble des Rôles

Le système distingue deux niveaux d'accès principaux :

### **Administrateur (`admin`)**
Le rôle avec les privilèges les plus élevés. Il a un accès total à toutes les fonctionnalités techniques et de gestion.

- **Gestion des Utilisateurs** :
    - Créer, modifier et supprimer n'importe quel utilisateur.
    - Promouvoir un utilisateur au rang d'administrateur.
    - Voir la liste complète des utilisateurs du système.
- **Fonctionnalités Techniques** :
    - Accès au tableau de bord des **Activités** (logs système complets).
    - Accès aux **Journaux en Temps Réel** (Live Logs) via WebSocket.
    - Accès à la **Documentation API** détaillée.
    - Utilisation des endpoints de débogage API.
- **Tableau de Bord** :
    - Vue complète incluant les statistiques globales d'activité.

### **Utilisateur / Collaborateur (`user`)**
Le rôle standard pour les membres de l'équipe ou les clients. Accès limité aux opérations quotidiennes.

- **Gestion des Utilisateurs** :
    - **Restriction** : Ne peut créer que des profils de type **"collaborateur"** (rôle `user`).
    - **Restriction** : Ne peut pas supprimer d'utilisateurs.
    - **Restriction** : Ne peut pas promouvoir d'autres administrateurs.
- **Interface Simplifiée** :
    - Masquage des sections techniques (**Activités**, **Logs**, **Documentation API**).
    - Navigation épurée (sections `/activities` et `/docs` masquées).
- **Tableau de Bord** :
    - Vue simplifiée sans les statistiques techniques globales.

## 2. Sécurité Backend (API)

Les restrictions ne sont pas seulement visuelles mais appliquées strictement sur le serveur :

- **Middleware `requireAdmin`** : Protège les routes sensibles comme la suppression d'utilisateurs ou l'accès aux logs complets.
- **Validation des Rôles** : Lors de la création/modification d'un utilisateur par un non-admin, le backend force le rôle à `user` si une tentative de promotion est détectée.
- **Isolation des Données** : Les endpoints comme `/activities/summary` filtrent automatiquement les données en fonction de l'utilisateur connecté s'il n'est pas admin.

## 3. Matrice des Permissions

| Fonctionnalité | Administrateur | Utilisateur |
| :--- | :---: | :---: |
| Gérer ses sessions WhatsApp | ✅ | ✅ |
| Envoyer des messages (IA/Manuel) | ✅ | ✅ |
| Créer un nouvel admin | ✅ | ❌ |
| Créer un collaborateur | ✅ | ✅ |
| Voir les logs système | ✅ | ❌ |
| Accéder à la Doc API | ✅ | ❌ |
| Voir les Live Logs | ✅ | ❌ |
| Endpoints Debug API | ✅ | ❌ |

---
*Dernière mise à jour : 2026-02-07*
