# Integration Paiement GeniusPay

Whappi utilise maintenant uniquement GeniusPay pour les paiements d'abonnement.

## Variables d'environnement requises

```env
GENIUSPAY_BASE_URL=http://pay.genius.ci/api/v1/merchant
GENIUSPAY_API_KEY=your_api_key
GENIUSPAY_API_SECRET=your_api_secret
GENIUSPAY_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=https://whappi.kamtech.online
```

## Checkout

- Route backend: `POST /api/v1/payments/checkout`
- Le backend cree la transaction GeniusPay
- L'utilisateur est redirige vers `checkout_url`

## Webhook

- Route backend: `POST /api/v1/payments/geniuspay/webhook`
- Signature attendue: `X-GeniusPay-Signature`
- Evenement attendu pour activer l'abonnement: `payment.success`

## Metadata envoyee a GeniusPay

Whappi envoie ces champs pour retrouver proprement l'utilisateur et le plan:

- `order_id`
- `user_id`
- `user_email`
- `plan_id`
- `plan_code`

## Retour utilisateur

Apres paiement, GeniusPay redirige l'utilisateur vers:

- succes: `/dashboard/billing?payment=geniuspay&status=success&order=...`
- erreur: `/dashboard/billing?payment=geniuspay&status=error&order=...`

L'activation finale du plan reste pilotee par le webhook signe.
