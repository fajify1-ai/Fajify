# Fajify Admin web

Next.js App Router application with Better Auth sign-in and server-validated administrator sessions. The `/dashboard` route requires the `platform-admin` role on the server. Platform API requests continue through the same-origin allowlisted proxy; the dashboard does not grant authorization by itself.

The current dashboard UI provides:

- Responsive, collapsible platform navigation with light and dark themes.
- Global search (`Cmd+K` / `Ctrl+K`), queue notifications, account security and sign out.
- Live business-application review and simulated-payment queues backed by the existing admin API endpoints.
- Searchable, sortable, filterable, paginated tables, row selection and local export of selected visible fields.
- Explicitly confirmed application decisions and test-only payment outcomes.
- Connected, scoped API workspaces for customer-review moderation, marketplace restrictions, support cases, incident management, monitoring, reporting, business reports, customer activity, consistency checks, and audit history.
- Governed mutations use the existing audited backend commands and request keys; every read and write still passes through the same-origin admin proxy and NestJS scope checks.
- Loading, empty, retry/error, detail, and pagination states. No sample platform metrics are shown.
- Current queue totals and recent queue activity only; historical trend percentages are omitted until the API provides a real comparison period.

Global platform settings and full customer, business, and ride directories remain unavailable because the API does not provide those admin endpoints. The connected customer and business views are limited to the existing audited activity and report lookups. Higher-risk account suspension, provider-finance, payout, settlement, and tariff operations are deliberately not exposed by the web proxy.

See [authentication implementation and setup](../../docs/engineering/BETTER_AUTH_IMPLEMENTATION.md).
