# frontend/src/app/dashboard/users/ - SaaS Accounts Console

## Purpose

Admin console for user accounts, subscriptions, usage, sessions, and manual activation flows.

## Local Contracts

- Only admins may access this page.
- The main table must remain usable even if user-detail fetches fail.
- The side sheet is a deep-dive helper, not a prerequisite for the page to function.
- Manual subscription activation must reflect real commercial offers:
  - `starter`
  - `pro`
  - `business`
- The table is both an ops tool and a commercial follow-up tool, so labels must stay clear and honest.

## UX Guidance

- Prioritize scan speed: attention queue, segments, search, account state.
- Keep role, plan, expiry, and usage readable without opening the detail sheet.
- Inline errors should explain which part failed:
  - list loading
  - detail loading
  - mutation failure

## Safety Notes

- Role changes and deletions are destructive actions; do not hide them behind ambiguous wording.
- Never assume `subscription_expiry`, `message_limit`, or `message_used` are always present.
- Treat manual plan activation as an audit-worthy admin action.

## Common Pitfalls

- Mixing user profile UX with admin account ops creates clutter.
- Raw API errors make the page feel broken even when only one sub-call failed.
- Subscription labels should stay aligned with the commercial offers already shipped in the dashboard and landing.

## Child DOX Index

*No children. This folder is a DOX leaf.*
