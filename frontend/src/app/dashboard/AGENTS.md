# frontend/src/app/dashboard/ - Dashboard Shell and Role Split

## Purpose

This area owns the dashboard entry experience for both product users and admins. It is the highest-risk frontend zone because route `/dashboard` is role-sensitive and the shell is intentionally split.

## Local Contracts

- `/dashboard` is **not** a generic home page:
  - admins see the admin center
  - non-admins see the co-admin user center
- Admin experience is exclusive:
  - no user billing/profile/support pages in the admin shell
  - no Wappy mascot in admin
  - no user navigation block in admin mode
- User experience keeps:
  - sessions
  - moderation
  - billing
  - support
- `layout.tsx` is the authority for shell behavior, navigation, redirects, and admin/user separation.
- `page.tsx` is the authority for the center view. Keep admin and user branches clearly separated.

## Editing Guidance

1. If touching navigation or shell behavior, inspect `layout.tsx` first.
2. If touching the center page, preserve the role split and avoid leaking user onboarding into admin.
3. Prefer admin-specific copy for admin pages; avoid "co-admin" language in the admin center.
4. When adding new admin pages, register them in admin navigation only.
5. When adding new user pages, confirm admins are redirected away if the page is not meaningful for admin.

## Known Pitfalls

- Reusing user widgets inside admin pages quickly pollutes the admin UX.
- The maintenance overlay bypasses admins; do not remove that bypass casually.
- Admin pages should not show raw API errors or collapse entirely when a secondary dataset fails.

## Child DOX Index

- `support-inbox/AGENTS.md` - admin support and transactions
- `users/AGENTS.md` - SaaS account operations
- `maintenance/AGENTS.md` - maintenance console behavior
