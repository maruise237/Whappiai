# frontend/src/app/dashboard/maintenance/ - Maintenance Control

## Purpose

Admin control surface for maintenance mode. This page edits the maintenance state seen by non-admin dashboard users through the overlay provider.

## Local Contracts

- Admins can activate/deactivate maintenance immediately.
- Admins can schedule a maintenance window.
- Admins are intentionally **not** blocked by the maintenance overlay.
- The frontend state must tolerate `enabled` coming back as:
  - `1` / `0`
  - `true` / `false`
  - stringified variants

## Critical Backend Coupling

- Admin writes go through `/api/v1/admin/maintenance*`.
- User-facing overlay reads `/api/v1/maintenance/status`.
- If you change one side, check the other side immediately.

## UX Rules

- Immediate activation/deactivation must feel explicit and reversible.
- Do not imply that maintenance affects public landing pages if it only affects dashboard routes.
- Show degraded-state banners if loading fails, but do not crash the form.

## Common Pitfalls

- Updating the admin route without updating the public status route.
- Assuming the maintenance row already exists in the database.
- Assuming integer-only `enabled` values with Postgres-backed reads.

## Child DOX Index

*No children. This folder is a DOX leaf.*
