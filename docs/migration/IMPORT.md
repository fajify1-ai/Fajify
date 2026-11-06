> Historical evidence below is superseded for current development by [M2-P2 Firebase removal](../engineering/M2_P2_FIREBASE_REMOVAL.md). The product owner's 2026-10-26 instruction authorizes removal before customer APIs exist, using typed unavailable boundaries.

# Faji Customer Flutter Import — Exact Tree Verification

## Import status

**Complete as a source-file migration on `feat/m1-import-customer-flutter`; runtime/build acceptance remains pending.**

- Upstream: https://github.com/Faith-loves/Faji
- Upstream pinned commit: `b96cc1f294095627b8d2047647505de881fa2e4e` (2026-10-16)
- Upstream root Git tree: `f4fc4ad64ede410a2f61ce281905a9a895285407`
- Destination: `apps/customer_mobile/`
- Imported tracked files: **287** (151 text/code and 136 image/icon assets)
- Verification: exact path-to-blob-SHA comparison (287/287) and identical subtree SHA `f4fc4ad64ede410a2f61ce281905a9a895285407`
- Upstream original author attribution: **Temiloluwa Faith Kareem** (see `AUTHORS.md`).

## History and limitations

This API-based import preserves every tracked file byte-for-byte (as evidenced by the matching Git tree hash), the original commit identifier in documentation, and authorship attribution. **The original upstream commit object/ancestry has NOT been imported:** the connected GitHub API only supplied repository-scoped Git object creation with current connection author metadata. The original upstream history remains accessible through the upstream URL. Do not describe this as a true git-subtree history-preserving import.

## What remains before merging

1. Confirm permission from the upstream code and asset rights holders; upstream has no declared LICENSE.
2. Review `apps/customer_mobile/android/app/google-services.json`, an existing client Firebase config already present in the public upstream. Confirm Firebase configuration ownership/restrictions and any asset rights. Do not mistake client config for a production server credential.
3. Run `bash tooling/verify-legacy-flutter.sh` on a local clone to verify imported tree and file count.
4. On a supported Flutter environment, run `flutter pub get`, `flutter analyze`, `flutter test`, `flutter build apk --debug` (or equivalent target-platform build). Record actual pass/fail results.
5. Review customer app functionality and ensure new Keycloak/PostgreSQL/NestJS integration is planned without assuming legacy Firebase services have been replaced.
6. Review PR #1 and merge only after the above release gates are satisfied.

## Legacy functionality is not new production integration

Source currently initializes Firebase and depends on Firebase Auth and Cloud Firestore. Payment and reservation flows may be prototypes. Importing the code does **not** migrate Firebase data, authenticate through Keycloak, implement the new backend, enable merchant/driver production operations, or establish payment settlement.

The original upstream repository has not been modified.
