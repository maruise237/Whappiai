# 🚀 Guide de Déploiement Whappi sur Dokploy

Ce guide explique comment déployer l'architecture Whappi (Frontend Next.js + Backend Node.js) sur un serveur utilisant **Dokploy** avec Traefik et SSL automatique.

## 📋 Prérequis

1.  Un serveur avec **Dokploy** installé.
2.  Un nom de domaine avec deux sous-domaines pointant vers l'IP de votre serveur (ex: `app.domaine.com` et `api.domaine.com`).
3.  Un compte **Clerk** configuré pour votre application.

## 🛠️ Étapes de Configuration dans Dokploy

### 1. Créer un Projet
Dans l'interface Dokploy, créez un nouveau projet nommé `Whappi`.

### 2. Configuration du Réseau
Assurez-vous que le réseau `dokploy-network` existe. Dokploy le crée généralement par défaut. S'il n'existe pas, créez-le dans l'onglet **Networks**.

### 3. Déploiement via Docker Compose
1.  Cliquez sur **Create Service** > **Compose**.
2.  Copiez le contenu du fichier `docker-compose.yml` du projet.
3.  **Important** : Dokploy gère les variables d'environnement. Dans l'onglet **Environment**, ajoutez toutes les variables listées dans le `.env.example`.

### 4. Variables d'Environnement à Configurer
| Variable | Description |
| :--- | :--- |
| `FRONTEND_DOMAIN` | Sous-domaine frontend (ex: `app.domaine.com`) |
| `BACKEND_DOMAIN` | Sous-domaine backend (ex: `api.domaine.com`) |
| `CLERK_SECRET_KEY` | Clé secrète Clerk (Backend) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk (Frontend) |
| `TOKEN_ENCRYPTION_KEY` | Clé hex 64 caractères (Sécurité WhatsApp) |
| `SESSION_SECRET` | Secret pour les sessions Express |
| `CLERK_WEBHOOK_SECRET` | Secret pour synchroniser les utilisateurs |

## 📦 Persistance des Données (Volumes)
Le `docker-compose.yml` définit 3 volumes nommés pour garantir que vos sessions WhatsApp et votre base de données ne soient pas perdues lors des mises à jour :
-   `whappi-data` : Base de données SQLite.
-   `whappi-sessions` : Sessions WhatsApp (évite de rescanner le QR).
-   `whappi-media` : Fichiers médias reçus/envoyés.

## 🔒 Configuration SSL & WebSocket
Traefik gère automatiquement les certificats SSL via Let's Encrypt grâce aux labels définis dans le `docker-compose.yml`. 
Le support des **WebSockets** (crucial pour le QR Code WhatsApp en temps réel) est activé via les middlewares Traefik configurés sur le service backend.

## 🔄 CI/CD (Mises à jour automatiques)
Connectez votre dépôt GitHub à Dokploy pour activer le déploiement automatique à chaque `git push`. Dokploy reconstruira les images Docker en utilisant les Dockerfiles multi-stage optimisés pour la production.

## 🧪 Vérifications Post-Déploiement
1.  Accédez à `https://api.votre-domaine.com/api/v1/health` pour vérifier que le backend répond.
2.  Accédez à `https://app.votre-domaine.com` pour le tableau de bord.
3.  Vérifiez que la console du navigateur ne contient pas d'erreurs CORS lors des appels API.
