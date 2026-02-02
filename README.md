# Whappi - WhatsApp API Server

Whappi est une API WhatsApp puissante et légère utilisant la bibliothèque `@whiskeysockets/baileys`, accompagnée d'un tableau de bord moderne en Next.js.

## Structure du projet

- `/` : Backend Express.js
- `/frontend` : Frontend Next.js (Dashboard)

## Déploiement avec Docker (Recommandé)

Le projet est configuré pour être déployé facilement avec Docker Compose.

1. **Prérequis** : Docker et Docker Compose installés.
2. **Configuration** : Copiez le fichier `.env.example` vers `.env` et configurez vos variables.
3. **Lancement** :
   ```bash
   docker compose up --build -d
   ```
   - Le backend sera disponible sur le port `3000`.
   - Le frontend sera disponible sur le port `3001`.

## Installation Manuelle

### 1. Installation des dépendances
```bash
npm install
cd frontend && npm install
```

### 2. Lancement en mode développement
```bash
npm run dev
```
Cette commande lance simultanément le backend et le frontend grâce à `concurrently`.

## Mise en ligne sur GitHub

Si vous souhaitez pousser ce projet sur votre propre dépôt GitHub :

1. Créez un nouveau dépôt public sur GitHub nommé `Super-Light-Web-WhatsApp-API-Server-main`.
2. Exécutez les commandes suivantes :
   ```bash
   git remote add origin https://github.com/votre-utilisateur/Super-Light-Web-WhatsApp-API-Server-main.git
   git branch -M main
   git push -u origin main
   ```

## Auteur
Basé sur le travail de **Alucard0x1**.
Amélioré et configuré pour le déploiement par Trae AI.
