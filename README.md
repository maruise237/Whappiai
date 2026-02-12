# 🚀 Whappi - WhatsApp API Server & Dashboard

Whappi est une solution complète, légère et puissante pour gérer l'automatisation de WhatsApp. Elle combine un serveur API robuste basé sur **Baileys** et un dashboard moderne construit avec **Next.js**.

## ✨ Caractéristiques

- **Multi-Sessions** : Gérez plusieurs comptes WhatsApp simultanément.
- **Dashboard Moderne** : Interface utilisateur intuitive avec mode sombre, statistiques en temps réel et gestion des sessions.
- **API REST & Webhooks** : Intégrez facilement WhatsApp à vos applications existantes.
- **IA Intégrée** : Support pour les réponses automatiques basées sur l'IA.
- **Modération de Groupe** : Outils avancés pour la gestion et l'animation de groupes.
- **Déploiement Facile** : Prêt pour Docker et optimisé pour Dokploy/Coolify.

## 🛠️ Stack Technique

- **Backend** : Node.js, Express, Baileys, SQLite (better-sqlite3).
- **Frontend** : Next.js 14, Tailwind CSS, Shadcn UI, Clerk Auth.
- **Infrastructure** : Docker, Docker Compose.

## 🚀 Installation Rapide

### Pré-requis
- Docker et Docker Compose installés.
- Un compte Clerk pour l'authentification (optionnel si configuré autrement).

### Configuration
1. Clonez le dépôt :
   ```bash
   git clone https://github.com/votre-username/whappi.git
   cd whappi
   ```
2. Configurez l'environnement :
   Copiez le fichier `.env.example` en `.env` et remplissez vos variables :
   ```bash
   cp .env.example .env
   ```

### Lancement avec Docker (Recommandé)
```bash
docker-compose up -d --build
```
- **Backend API** : `http://localhost:3000`
- **Dashboard** : `http://localhost:3001`

## ☁️ Déploiement sur Dokploy

Ce projet est optimisé pour être déployé sur un VPS via **Dokploy**.
1. Connectez votre dépôt GitHub à Dokploy.
2. Créez une nouvelle application "Compose".
3. Dokploy utilisera automatiquement le fichier `docker-compose.yml` présent à la racine.
4. N'oubliez pas de configurer les **Volumes** pour la persistance des sessions WhatsApp.

## 🔒 Sécurité
- Authentification via Clerk.
- Chiffrement des jetons de session.
- Protection contre les attaques par force brute (Rate Limiting).

## 📄 Licence
Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

---
Développé avec ❤️ par Kamtech.
