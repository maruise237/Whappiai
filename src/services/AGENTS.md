# src/services/ - Service Layer Responsibilities

## Purpose

This folder contains the core business logic of Whappi: provider orchestration, pricing, subscriptions, payments, moderation, engagement, caching, Redis integration, and support schema helpers.

## Local Contracts

- `payment.js` is the source of truth for MoneyFusion integration behavior.
- `PricingService.js` and `SubscriptionService.js` define commercial plan logic.
- `AccountAccessService.js` defines plan enforcement rules such as moderated-group limits.
- `SessionService.js`, `SessionStore.js`, and `redis.js` govern runtime session behavior.
- `QueueService.js` governs persistent queue behavior and should remain Redis-first in production.
- `supportSchema.js` maintains support persistence shape.

## Editing Guidance

1. Before changing plan rules, check both pricing copy and access enforcement.
2. Before changing payment behavior, check checkout creation, transaction persistence, webhook reconciliation, and support/admin transaction views.
3. Before changing session/provider behavior, check both provider docs and dashboard expectations.
4. Prefer additive resilience over clever shortcuts:
   - cached fallbacks
   - explicit normalization
   - idempotent updates

## Risk Areas

- Payment activation and webhook reconciliation
- Session/provider status synchronization
- Redis-backed shared state and rate limiting
- Group cache freshness vs. dashboard expectations
- Cross-surface plan limits (billing, moderation, profile, admin)

## Child DOX Index

- `providers/AGENTS.md` - WhatsApp transport abstraction and Evolution API rules
