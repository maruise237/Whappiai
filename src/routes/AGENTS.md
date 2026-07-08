# src/routes/ - HTTP Route Contracts

## Purpose

This folder owns the HTTP contract of Whappi: public API, admin API, support, payments, maintenance, user management, and webhook entrypoints.

## Local Contracts

- `admin.js` owns admin-only platform routes.
- `payments.js` owns GeniusPay checkout and webhook endpoints.
- `public.js` owns unauthenticated status endpoints, including maintenance status.
- `support.js` owns customer/admin support APIs and inbox flow.
- `users.js` owns account management routes.
- `api.js` remains the broad application API surface for sessions, moderation, messaging, and several admin-adjacent endpoints.

## Rate Limiting Guidance

- Do **not** attach normal admin/product routes to the strict auth-attempt limiter.
- Keep webhook rate limiting separate from user/admin fetch traffic.
- If a page makes several parallel calls, prefer a tolerant app/admin limiter over an auth limiter.

## Payment Guidance

- Browser redirect is convenience UX only; webhook/server correlation is the source of truth.
- Webhook handlers must stay idempotent and safe against duplicate notifications (MoneyFusion peut envoyer plusieurs fois le même webhook).
- Transaction/user correlation via `personal_Info[0].orderId` et `tokenPay`.
- MoneyFusion ne signe pas ses webhooks : la sécurité repose sur la confidentialité du webhook URL et la corrélation tokenPay + personal_Info.

## Maintenance Guidance

- Admin maintenance routes and public maintenance status must stay in sync.
- Ensure `maintenance_settings` row existence before updating it.
- Be tolerant of `enabled` values coming back as integer or boolean.

## Support Guidance

- Support APIs are sensitive because they combine client messages and transactions.
- Keep validation and sanitization strong.
- Never expose hidden admin-only fields to user-facing endpoints.

## Child DOX Index

*No children. This folder is a practical DOX leaf for route-level work.*
