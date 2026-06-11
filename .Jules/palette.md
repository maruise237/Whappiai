## 2026-06-09 - [Centralized Tooltip Architecture]
**Learning:** Nesting TooltipProviders in a complex React tree can cause hydration mismatches and performance overhead. Centralizing the provider in the root layout improves reliability and code cleanliness.
**Action:** Always check for a root TooltipProvider before adding one to local components.

## 2026-06-09 - [Visual Confirmation for Copy Actions]
**Learning:** Users appreciate immediate visual feedback for clipboard actions. Toggling the icon from Copy to Check for 2 seconds is more effective than just a toast.
**Action:** Implement icon-toggling state for all high-frequency copy buttons.
