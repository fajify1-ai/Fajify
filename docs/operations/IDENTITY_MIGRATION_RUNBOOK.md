# Existing identity migration: rehearsal and cutover controls

No production data was read or changed. The supplied claim-preparation command **refuses production and staging databases**: only explicitly named/marked disposable PostgreSQL 16 rehearsal databases are supported. A production execution path requires a separately approved change with real ownership review and deployment authorization.

## Identity invariant

For a reconciled legacy account, `auth_user.id` is the existing `identity_subject`. `user_profiles.id`, `account_access`, memberships, bookings, payments, ledger entries, ride records and admin scopes are neither renamed nor copied. Migration 0105 changes provisioning only for an owner-prepared claim: it preserves the existing profile and account state and does not add a customer role. The reviewed legacy role inventory supplies coarse roles; existing resource and admin grants remain authoritative.

Do not import legacy password hashes. Do not join two records because emails match. Registration is closed by default in staging/production, and must remain closed during inventory/reconciliation. Case-insensitive unique email constraints reject collisions rather than silently merging identities. An already-existing Better Auth record with a conflicting email is a manual reconciliation blocker; neither identity's data is moved automatically.

## Ownership review and preparation

1. Quiesce identity mutations in the disposable rehearsal. Take and protect a consistent custom-format database backup and escrow the corresponding Better Auth secret separately. Restore it before proceeding; use `tooling/backup-rehearsal.sh` and the restore procedures below.
2. Build an offline inventory from an approved legacy export and application account IDs. Exclude passwords/hashes, live tokens and secrets. Reconcile duplicate emails, missing profiles, suspensions, privileged roles and orphaned references. The tool requires an existing profile and account row.
3. Independently verify the person's ownership of the **specific legacy subject**, through an approved supervised identity process or equivalent independently authenticated evidence. Email access or an email match alone is insufficient. Two distinct reviewers attest the subject, source role inventory, evidence ticket and verification time. Real ownership review is not simulated by the test fixtures.
4. Create a private reviewed manifest, outside Git, in this shape (use actual reviewed evidence, not the example):

```json
[{
  "subject": "existing-legacy-subject",
  "email": "verified-contact@example.test",
  "name": "Existing Profile",
  "roles": ["customer"],
  "evidence": {
    "method": "independent-ownership-check",
    "verifiedSubject": "existing-legacy-subject",
    "ticket": "REVIEW-TICKET",
    "reviewers": ["reviewer-one", "reviewer-two"],
    "verifiedAt": "REPLACE-WITH-ACTUAL-RECENT-UTC-TIMESTAMP"
  }
}]
```

5. On a marked disposable rehearsal database, using its migration owner:

```sh
FAJI_DATABASE_URL="$DISPOSABLE_OWNER_URL" pnpm --filter @faji/database exec tsx scripts/prepare-identity-claims.ts work/reviewed-manifest.json work/delivery.claims.json
```

The operation is atomic, records ownership evidence/audit, preserves suspended status, reserves the identity/email, and issues 256-bit one-time claims. The delivery file is created with mode 0600 and is never overwritten. Only SHA-256 token digests are stored in the owner-only claim table. Deliver each token through the independently verified secure channel, never an unreviewed email match or logs. Claims expire after 24 hours.

6. The user opens **Claim existing account** in any Faji web/native app, supplies their token and a new password, then signs in normally. The server hashes the password with Better Auth. Claim consumption is row-locked, transactional, single-use, audited and rate limited. Its API cannot select a target subject, roles or scopes. A database trigger blocks credential creation through password recovery until the independent claim is consumed; email recovery cannot bypass this process.
7. Verify profile UUID and identity subject, every membership/scope, historical bookings/payment/ledger references, suspension decisions and cross-tenant denial before considering a broader rollout. Rehearsal evidence uses synthetic data only.

## Expiration, lost deliveries and revocation

Pending claims can be reissued only by the owner tool with **renewed independent evidence**:

```sh
FAJI_DATABASE_URL="$DISPOSABLE_OWNER_URL" pnpm --filter @faji/database exec tsx scripts/prepare-identity-claims.ts work/reviewed-manifest.json work/new-delivery.claims.json --reissue
```

This rotates the digest, invalidates the previous token and audits reissuance. It does not change existing roles. Claimed identities cannot be reissued. To revoke an unclaimed token, the owner expires its `auth_legacy_claims.expires_at` in an audited operator transaction; runtime roles cannot issue, read or edit claims. Handle an issuance commit followed by a delivery-file write failure through this reissuance process, not by guessing/recovering a token.

## Backup, restore and rollback

Use a fresh, distinct, marked disposable restore database on the same isolated PostgreSQL 16 cluster. The DBA creates PostGIS first, revokes public schema CREATE, and temporarily grants the restore owner INSERT on `spatial_ref_sys` to restore custom SRIDs. The API runtime receives no such grant. The restore script skips only the pre-provisioned extension's owner comment; it restores application schema, data and ACLs in one transaction.

```sh
export FAJI_DATABASE_URL="$DISPOSABLE_OWNER_URL"
export FAJI_DISPOSABLE_DATABASE=fajify_m8_test_rehearsal
export FAJI_RESTORE_URL="$DISTINCT_DISPOSABLE_RESTORE_OWNER_URL"
# PostgreSQL 16 pg_dump/pg_restore/psql and pinned pnpm must be on PATH.
bash tooling/backup-rehearsal.sh
```

Revoke the temporary extension INSERT grant after restoration. The script checks every table's row count/content checksum and the complete migration ledger, then replays migrations without rewriting checksums. Private dumps include credentials, sessions, encrypted factor secrets and personal data: keep them mode 0600, encrypt retained backups using approved backup/KMS tooling, and keep key escrow separate. The included script is restricted to disposable targets; it is not an authorized production backup operation.

Before claims are used, rollback can expire pending claims and disable the new auth ingress while preserving all application rows. Do not delete pre-existing roles or profiles. After claims/new writes, a code rollback alone does not restore the previous identity system or reconcile password changes. Freeze writes, preserve incident/audit evidence, rehearse restoration to a **different** database, verify references and data written after the snapshot, then obtain a separate cutover decision. Never blindly restore an old snapshot over newer bookings/transactions. Prefer a reviewed forward fix when it preserves newer writes.

## Readiness boundary

Disposable claims, collision handling, scope isolation and database backup/restore are executable and tested. Real-user ownership verification, production export/reconciliation, secure delivery operations, production key escrow, cutover downtime, post-snapshot write recovery and rollback to an earlier identity release remain operator acceptance gates. No production migration is authorized by this implementation.
