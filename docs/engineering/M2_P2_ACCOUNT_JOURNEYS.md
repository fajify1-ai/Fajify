# FAJIFY M2-P2 — Customer account journeys (2026-10-26)

Working folder: C:\Users\omola\OneDrive\Desktop\Fajify-main. Branch: feat/m2-p2-customer-auth. Starting local commit: 642f86e5bf5c131b394fb6527e1e17ddf4b35343. No remote write, push or main merge is performed.

## Milestone 1 — Flutter registration, verification and recovery

### Completed code

- CustomerBrowserJourneys extends the existing browser-auth contract with verified-session results for registration, recovery and email verification. No email/password fields are accepted by this contract.
- AppAuth uses the existing configured authorization flow with prompt=create for registration and kc_action=VERIFY_EMAIL for verification. No registration, reset-password or email endpoint URL is fabricated.
- Recovery requests a fresh provider login with prompt=login. The Fajify recovery page explicitly tells users to choose Forgot password on the provider page. It collects no local email or password in browser mode and does not claim a reset email was sent or a password changed. Direct reset-screen targeting remains outside this milestone.
- All three journeys share the native authorization/secure-store pipeline. AppAuth completion alone is insufficient: UserInfo must report verified email; /api/v1/auth/me must return the matching active customer identity. Account approval/suspension policy is unchanged.
- Registration completion can now navigate to the existing customer destination only after verified access. Verification-required errors produce an explicit denied AuthState without a session, plus a browser verification/retry action. Pending/suspended/missing account responses stay denied; a 403 is not fabricated into a specific approval status.
- Provider cancellation never persists a token response as an authenticated session. Controller generation/busy guards prevent concurrent actions or a late recovery result from defeating logout.
- Shared completion navigation is reused by sign-in, registration, verification and recovery. Existing routes and protected-navigation checks remain intact.

### Reusable Components

Reused AuthFormLayout, AuthPrimaryButton, AuthErrorMessage, existing design tokens, AuthScope, AuthController, CustomerAccessGate, AppAuthOidcGateway, NativeKeycloakRepository and the existing session/identity clients.

Added AuthStatusView because the same verification, expiry, progress, failure and role-denial feedback is needed in both account-sheet variants and the recovery screen. Added shared customer completion/verification navigation helpers used by those screens. No new colors, typography, login provider or duplicate application state were introduced.

Legacy form variants and existing component pixel comparisons remain intact. Browser-specific recovery copy and button wording now describe the actual provider handoff. The only new action button uses the existing primary button style.

### Verification

- Flutter analyze --no-pub: zero issues.
- Full flutter test --no-pub: 80 passed, zero failed.
- Includes ten additional journey tests over the previous 70: SDK provider hints/cancelled-action rejection, controller state/race/redaction checks, shared verification/denial widgets, recovery privacy and guarded navigation.
- Existing three component pixel comparisons are included in the passing suite.
- Test evidence: C:\Users\omola\AppData\Local\Temp\fajify-m2-p2-journey-flutter-tests.log.
- No dependency versions changed. Tests use the existing resolved package graph with --no-pub. The earlier native plugin symlink limitation is not represented as resolved by this milestone.
- No real Keycloak instance, SMTP delivery, native device browser, keystore/keychain or Android/iOS build was verified. The standard local Android SDK directory is absent.

### Provider behavior and remaining gaps

The [Keycloak 26.8 administration guide](https://www.keycloak.org/docs/26.8.0/server_admin/) documents prompt=create and application-initiated actions. The requested action itself is not proof the user completed it; the final provider/backend checks remain mandatory. Recovery is a guided provider flow, not a direct email API or password-update form.

Deployment settings are still explicitly pending. Existing native and web enable flags/configuration gates remain in place; no production values or client IDs were added. Keycloak realm registration/verification/recovery behavior, supported deployed version, callback return, SMTP and active-account approval need live acceptance. Automatic self-enrollment or approval is not implemented; no backend security policy is changed.

The verified Flutter milestone is committed locally before the web milestone. The progress message records its exact hash. Manual delivery (execute yourself):

~~~powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main'
git status --short
git branch --show-current
git log -5 --oneline
git push --set-upstream origin feat/m2-p2-customer-auth
~~~

## Eight M2-P2 acceptance tasks

Statuses refer to full acceptance, including live/native evidence. No full task is labelled completed solely because an adapter or unit test exists.

| Task | Status | Code progress and remaining gates |
| --- | --- | --- |
| 1. Flutter OIDC Code + PKCE | PARTIALLY IMPLEMENTED | SDK/composition and browser journey hints implemented; deployed settings/native acceptance blocked |
| 2. Registration, verification and login | PARTIALLY IMPLEMENTED | Browser adapters, shared verification state/retry and verified completion navigation implemented; live registration/SMTP and account approval journey pending |
| 3. Secure password recovery | PARTIALLY IMPLEMENTED | Provider-guided fresh-browser flow and honest unavailable states tested; direct reset handoff and live recovery/old-password rejection evidence pending |
| 4. Secure session lifecycle | PARTIALLY IMPLEMENTED | Secure storage, restoration, refresh and logout/race protections preserved; native token revocation and device acceptance pending |
| 5. Customer /auth/me profile | PARTIALLY IMPLEMENTED | Identity contract integrated; live API acceptance and a display-profile contract are blocked dependencies |
| 6. Protected navigation/customer roles | PARTIALLY IMPLEMENTED | Central access gate, verified completion navigation and role-denial feedback tested; live authorization acceptance pending |
| 7. Next.js server-managed auth | PARTIALLY IMPLEMENTED | Existing SDK/session/vault boundaries preserved; new journey/HTTP helpers are verified in the following milestone; durable stores, deployment configuration and mounting remain blocked |
| 8. Tests/build/integration evidence | PARTIALLY IMPLEMENTED | 80 Flutter tests passed; native/live evidence remains unavailable; web results recorded below |
