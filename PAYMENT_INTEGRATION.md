# Intégration Paiement Chariow - Guide

Ce guide explique comment finaliser l'intégration de la passerelle de paiement Chariow dans Whappi.

## 1. Prérequis

Vous devez avoir un compte marchand sur [Chariow](https://chariow.com).

## 2. Configuration Chariow

### Création des Produits
Créez 3 produits (ou variantes) correspondant aux plans Whappi :

1.  **Starter** : 2 500 FCFA / mois
2.  **Pro** : 5 000 FCFA / mois
3.  **Business** : 10 000 FCFA / mois

Notez les **IDs de produits** générés par Chariow.

### Récupération des Clés API
Dans votre tableau de bord Chariow (Paramètres > API), récupérez :
-   `API Key` (Clé Publique)
-   `Secret Key` (Clé Privée)

### Configuration Webhook
Configurez l'URL de notification (Webhook) dans Chariow pour pointer vers :
`https://votre-domaine.com/api/v1/payments/webhook`

## 3. Configuration Whappi

Ajoutez les variables suivantes dans votre fichier `.env` à la racine du projet (backend) :

```env
# 💳 Chariow Payment Integration
CHARIOW_API_KEY=votre_api_key_publique
CHARIOW_SECRET_KEY=votre_secret_key_privee
CHARIOW_WEBHOOK_SECRET=votre_secret_webhook_si_disponible

# IDs des produits Chariow (à remplacer par les vrais IDs)
CHARIOW_PRODUCT_STARTER_ID=prod_starter_xxx
CHARIOW_PRODUCT_PRO_ID=prod_pro_xxx
CHARIOW_PRODUCT_BUSINESS_ID=prod_business_xxx
```

## 4. Fonctionnement Technique

1.  **Frontend** : L'utilisateur sélectionne un plan sur `/dashboard/billing`.
2.  **Backend** : L'API `/api/v1/payments/checkout` crée une session de paiement Chariow.
3.  **Redirection** : L'utilisateur est redirigé vers Chariow pour payer (Mobile Money, Carte).
4.  **Confirmation** : Chariow appelle le Webhook `/api/v1/payments/webhook`.
5.  **Activation** : Le serveur met à jour la base de données :
    -   `plan_id` devient le plan choisi.
    -   `plan_status` devient `active`.
    -   `message_limit` est mis à jour.
    -   `subscription_expiry` est prolongé d'un mois.

## 5. Test

Pour tester sans payer réellement, utilisez les cartes de test ou le mode Sandbox de Chariow si disponible.
Actuellement, le code est en mode "Simulation" (voir `src/services/payment.js`). Une fois vos clés configurées, décommentez le code de production dans ce fichier.
