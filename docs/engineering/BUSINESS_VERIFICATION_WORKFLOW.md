# Business access and verification workflow

## Status model

Business workspace access, account identity verification, and business listing approval are separate:

- Account KYC is global to the account: `unverified`, `pending`, `verified`, or `rejected`. A government-issued ID is stored encrypted and reviewed by an administrator.
- Business review is per application: `pending`, `approved`, or `rejected`. Each business submits its own registration evidence and business photos; video and other supporting evidence are also supported.
- An application creates an owner membership immediately. Owners can open pending and rejected workspaces, update setup information, and submit or replace evidence. Manager, staff, and branch roles remain unavailable until the business is approved.
- Account KYC approval does not approve any business. Business approval requires verified account KYC, at least one `business_registration` document, and at least one `business_photo` for that application.
- Transactions, financial operations, and marketplace publication remain gated on business approval. Rejection reasons are retained and shown to the owner; a rejected business can submit a new application.

The Business UI leads with account ID upload, then offers business application details and per-business evidence. An account with pending KYC may prepare a business application, but administrators cannot approve it until KYC is verified. KYC rejection can be resubmitted with new evidence.

## API and administration

Authenticated account verification uses:

- `GET /api/v1/business/onboarding/account/kyc`
- `POST /api/v1/business/onboarding/account/kyc/documents`
- `GET /api/v1/business/onboarding/applications/mine`
- `POST /api/v1/business/onboarding/:id/verification-documents`

The owner workspace endpoint is `GET /api/v1/business/onboarding/:id/workspace`. Resource authorization still checks the signed identity, active account, owner membership, business ownership, and current business status.

Administrative KYC review is under `/api/v1/admin/governance/kyc`; document reads and decisions require the corresponding governance scope and privileged-request audit. Business application review remains under the governance approvals routes. Rejections require a reason.

Evidence is limited to 5 MB per file and encrypted at rest using `FAJI_VERIFICATION_ENCRYPTION_KEY`. KYC accepts JPEG, PNG, and PDF; business evidence additionally accepts MP4 and WebM. The encryption key must be configured before accepting uploads.

## Database rollout

Migration `0116_business_verification.sql` adds the account KYC tables, typed business evidence, rejection reasons, and owner memberships for existing applications. Existing approved businesses are returned to `pending` so prior approvals cannot bypass account KYC or the per-business evidence review; owners retain workspace access and must complete the new checks before listing or transacting. Apply it through the approved migration process, then run the matching runtime grants before deploying API/UI code that uses these tables. Confirm the deployment has the required encryption key and bounded request-body limits. This migration and workflow have not been applied to staging or production by this change.

The API unit suite and workspace typecheck/lint do not replace disposable PostgreSQL integration tests. Run the database-backed authorization and web-completion tests against an explicitly disposable database before rollout.
