# frontend/src/app/dashboard/support-inbox/ - Admin Support Inbox

## Purpose

Dedicated admin workspace for handling customer support threads and payment transactions. This page is operational, not decorative: it must stay readable and resilient under partial failure.

## Local Contracts

- Only admins may access this page.
- The page has two independent data streams:
  - support threads
  - transactions
- Failure in one stream must not make the other tab unusable.
- Replies sent here are visible to the customer in their support area.
- Payment status shown here is informational and operational; do not invent success states.

## UI Rules

- Keep the inbox pane scannable and compact.
- Keep the reply pane explicit about what is admin-only.
- Never display raw JSON backend errors in cards or banners.
- Use inline warning banners plus toasts for degraded states.

## Security Notes

- Inputs are assumed sanitized server-side, but do not build any client feature that trusts raw HTML from support messages.
- Treat transaction references and order IDs as sensitive operational data.

## Change Checklist

- If you add filters, ensure they do not increase fetch bursts unnecessarily.
- If you add payment actions, coordinate with backend idempotency and audit logging.
- If you add bulk actions, keep thread selection and transaction selection clearly separated.

## Child DOX Index

*No children. This folder is a DOX leaf.*
