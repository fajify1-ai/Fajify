# Customer Flutter application migration

## Source provenance

- Original repository: https://github.com/Faith-loves/Faji
- Pinned source commit: `b96cc1f294095627b8d2047647505de881fa2e4e` (2026-10-16)
- Destination repository: https://github.com/fajify1-ai/Fajify
- Target directory: `apps/customer_mobile/`
- Review branch: `feat/m1-import-customer-flutter`

## Import state

**Not yet imported.** This branch contains the target monorepo layout, not the legacy app itself. Use `tooling/import-legacy-flutter.sh` with explicit source reuse permission to perform the real import. The import script pins the upstream commit, verifies the imported Git tree and requires a clean worktree. It does not edit the source repository, and it does not merge the review branch into `main`.

## Rights and secrets

The public upstream source does not declare a LICENSE file. Obtain written authorization covering code and image assets before reproducing or distributing them. Upstream tracks `android/app/google-services.json`; review Firebase project ownership, key restrictions, rules and build-time configuration before publishing a release. GitHub history preservation retains any upstream files as part of the original commit. Existing Firebase Auth, Firestore, mock payment, and placeholder booking flows are prototype implementations, **not** the new approved architecture.

## Acceptance

1. Full original Git tree exists under `apps/customer_mobile/` and tree hash matches upstream exactly.
2. Upstream commit is an ancestor of the import branch's head (not a squash).
3. Other monorepo paths are present and docs accurately represent planned vs implemented modules.
4. Flutter dependencies resolve and `flutter analyze`, `flutter test`, and target platform builds are run in a suitable CI/local environment.
5. Any failures, Firebase configuration handling and licensing/attribution questions are addressed before merging.
