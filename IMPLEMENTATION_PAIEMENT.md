# Implémentation du Système de Paiement Whappi avec Chariow

Ce document détaille la stratégie technique pour l'intégration des paiements et de la gestion des licences via Chariow pour la plateforme Whappi.

## 1. Tarification (Pricing)

Les tarifs sont basés sur un abonnement mensuel avec des limites de messages iA :

| Plan | Prix (FCFA/mois) | Limite Messages iA |
| :--- | :--- | :--- |
| **Starter** | 2 500 FCFA | 500 messages |
| **Pro** | 5 000 FCFA | 2 000 messages |
| **Business** | 10 000 FCFA | 10 000 messages |

## 2. Architecture de l'Intégration Chariow

L'intégration utilise le système de licences de Chariow de manière transparente pour l'utilisateur final.

### Flux de Paiement
1. **Sélection du Plan** : L'utilisateur choisit un plan sur le dashboard Whappi.
2. **Checkout Chariow** : Redirection vers la page de paiement Chariow (gérant Mobile Money : Orange, MTN, Wave, etc.).
3. **Confirmation de Paiement (Webhook)** : Chariow envoie une notification `POST` au backend Whappi.
4. **Activation Automatique** : Le backend Whappi valide le paiement, récupère la licence (en arrière-plan) et met à jour les limites du compte utilisateur.

## 3. Configuration Chariow (Dashboard Chariow)

1. Créer un produit "Whappi Subscription" avec 3 variantes (Starter, Pro, Business).
2. Activer l'option "License Keys" pour ce produit.
3. Configurer l'URL du Webhook vers : `https://api.whappi.com/api/v1/payments/webhook`.

## 4. Modifications Techniques

### Base de Données (SQLite)
Ajout des colonnes suivantes à la table `users` :
- `plan_id` : ID du plan actuel (starter, pro, business).
- `plan_status` : Statut de l'abonnement (active, trialing, expired).
- `message_limit` : Nombre maximum de messages autorisés.
- `message_used` : Nombre de messages consommés ce mois-ci.
- `subscription_expiry` : Date d'expiration de l'abonnement.
- `chariow_license_key` : La clé de licence (cachée de l'utilisateur).

### API Backend (Routes)
- `POST /api/v1/payments/checkout/:planId` : Génère un lien de paiement Chariow.
- `POST /api/v1/payments/webhook` : Gère les notifications de paiement de Chariow.
    - Vérification de la signature du webhook.
    - Mise à jour des colonnes `plan_*` et `message_limit` dans la table `users`.
    - Enregistrement de la `chariow_license_key`.

### Validation des Messages (Middleware)
Un nouveau middleware devra vérifier si l'utilisateur a atteint sa limite avant de traiter un message iA :
```javascript
async function checkMessageLimit(req, res, next) {
    const user = req.currentUser;
    if (user.message_used >= user.message_limit) {
        return res.status(403).json({ error: "Limite de messages atteinte. Veuillez passer au plan supérieur." });
    }
    next();
}
```

## 5. Intégration API Chariow (Exemples)

### Validation d'une licence (Backend vers Chariow)
```bash
curl -X POST 'https://api.chariow.com/v1/licenses/validate' \
-H 'Authorization: Bearer VOTRE_API_KEY' \
-d 'license_key=XXXX-XXXX-XXXX'
```

### Réception du Webhook
Le payload du webhook Chariow contiendra les informations nécessaires pour identifier l'utilisateur (via `custom_fields` ou l'email) et activer son compte.

## 6. Prochaines Étapes
1. Création des produits sur le dashboard Chariow.
2. Implémentation du endpoint Webhook dans `src/routes/api.js`.
3. Migration de la base de données pour inclure les champs de souscription.
4. Mise à jour de l'interface Dashboard pour afficher l'état de l'abonnement.
