# Fajify Admin web

Next.js App Router application with Better Auth sign-in and server-validated administrator sessions. The `/dashboard` route requires the `platform-admin` role on the server. Platform API requests continue through the same-origin allowlisted proxy; the dashboard does not grant authorization by itself.

The current dashboard UI provides:

- Responsive, collapsible platform navigation with light and dark themes.
- Global search (`Cmd+K` / `Ctrl+K`), queue notifications, account security and sign out.
- Live business-application review and simulated-payment queues backed by the existing admin API endpoints.
- Searchable, sortable, filterable, paginated tables, row selection and local export of selected visible fields.
- Explicitly confirmed application decisions and test-only payment outcomes.
- Loading, empty, retry/error, and review-detail states. Other platform areas are presented as not yet connected; no sample platform metrics are shown.
- Current queue totals and recent queue activity only; historical trend percentages are omitted until the API provides a real comparison period.

The additional platform areas are UI placeholders only. New user, business lifecycle, ride, reporting and global-setting workflows require separately reviewed backend endpoints and authorization scopes before they are enabled.

See [authentication implementation and setup](../../docs/engineering/BETTER_AUTH_IMPLEMENTATION.md).
