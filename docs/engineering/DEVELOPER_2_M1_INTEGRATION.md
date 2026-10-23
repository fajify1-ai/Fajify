# Developer 2 — Milestone 1 mainline integration

Accepted scope: imported customer source, analyzer cleanup and the recorded
unauthenticated Android smoke baseline. This is not full application/runtime or
Firebase-migration acceptance. The product owner authorized baseline integration
before the Business/main-app device checks.

- Source branch: `feat/m1-d2-customer-analyzer-cleanup`.
- Source head: `9969539f9a27b2eb8f80444ec1ec9cb48eaf623f`.
- Physically tested implementation: `1a4a497eb4b589605a44bc4a46767ba65372a474`.
- Integration base: `bccbc5b30af93bb4c2437af4a939263b5e77d7c5`.
- All ten scaffold/backend conflicts retain the version already on main.
  Every existing main file was checked for byte-for-byte preservation.
- Customer source matches the accepted cleanup, apart from removing inherited
  blank lines at EOF in AndroidManifest.xml and MainActivity.kt. A comparison
  ignoring blank lines confirms no other customer-source difference.
- Integration verification on 23 October 2026, Flutter 3.47.7 / Dart 3.13.5:
  dependency resolution passed; full customer analyzer reported **zero issues**;
  **one widget test passed**; workspace structure and staged whitespace passed.
- APK build and partial physical-device evidence are the source branch's recorded
  local results. No new Android APK build or physical-device run is claimed for
  this integration checkout. No emulator was used.

Firebase remains in the customer application pending approved Keycloak/customer
API contracts. Authenticated workflows, bookings, payments and authenticated
offline recovery are not accepted by this baseline. The Business and Ride
placeholders here are superseded only by their separately verified workstreams.

The original import branch remains the source snapshot; use
[CUSTOMER_RUNTIME_AND_BACKEND.md](../migration/CUSTOMER_RUNTIME_AND_BACKEND.md)
for the migration inventory and limits of the device evidence.
