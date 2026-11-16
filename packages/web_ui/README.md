# Shared web UI and platform bridge

Customer and Business use the established Next.js/React stack and their recovered Figma assets. `client.tsx` supplies typed requests, resource/error/empty states and guarded actions; `styles.css` supplies shared red/white controls and responsive layouts.

`server.ts` is a fixed-upstream same-origin BFF, not an authentication service. It forwards only Better Auth cookies to existing Nest APIs. Nest remains the authority for sessions, account state, approval, scopes, ownership, prices, inventory and payments. Mutations require the configured web origin. Admin, Rider and Dispatch contracts are excluded.

`contracts.ts` is generated from `packages/api_contracts/openapi.json`. Merchant SQL-row responses currently lack response DTO schemas; `types.ts` records their existing field names.

Regenerate types with `pnpm --filter @faji/web-ui generate:contracts`; regenerate the route allowlist with `pnpm --filter @faji/web-ui generate:routes`. Run `check:routes` and `test` after a contract update.

See `docs/engineering/CUSTOMER_BUSINESS_WEB_COMPLETION.md` for inventory, dependencies, evidence and release limitations.
