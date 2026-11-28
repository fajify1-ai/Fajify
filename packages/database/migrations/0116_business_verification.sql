ALTER TABLE business_onboarding
 ADD COLUMN review_reason varchar(500);
ALTER TABLE web_business_submissions DROP CONSTRAINT web_business_submissions_subject_content_hash_key;
CREATE INDEX web_business_submissions_subject_hash_idx ON web_business_submissions(subject,content_hash);

ALTER TABLE web_verification_documents
 ADD COLUMN document_type varchar(32) NOT NULL DEFAULT 'business_document'
 CHECK(document_type IN ('business_document','business_registration','business_photo','business_video'));
ALTER TABLE web_verification_documents DROP CONSTRAINT web_verification_documents_mime_check;
ALTER TABLE web_verification_documents ADD CONSTRAINT web_verification_documents_mime_check
 CHECK(mime IN ('image/jpeg','image/png','application/pdf','video/mp4','video/webm'));

CREATE TABLE account_kyc_verifications (
 identity_subject varchar(255) PRIMARY KEY REFERENCES account_access(identity_subject),
 status varchar(16) NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','pending','verified','rejected')),
 submitted_at timestamptz,
 reviewer_subject varchar(255),
 reviewed_at timestamptz,
 rejection_reason varchar(500),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status IN ('unverified','pending') AND reviewer_subject IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL)
    OR (status='verified' AND reviewer_subject IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status='rejected' AND reviewer_subject IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_reason IS NOT NULL))
);

CREATE TABLE account_kyc_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_subject varchar(255) NOT NULL REFERENCES account_kyc_verifications(identity_subject),
 name varchar(120) NOT NULL,
 mime varchar(32) NOT NULL CHECK(mime IN ('image/jpeg','image/png','application/pdf')),
 ciphertext bytea NOT NULL,
 iv bytea NOT NULL CHECK(octet_length(iv)=12),
 tag bytea NOT NULL CHECK(octet_length(tag)=16),
 digest char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(identity_subject,digest)
);
CREATE INDEX account_kyc_documents_subject_idx ON account_kyc_documents(identity_subject,created_at DESC);
CREATE INDEX business_verification_documents_application_idx ON web_verification_documents(application_id,created_at DESC);
UPDATE business_onboarding
 SET status='pending',reviewer_subject=NULL,reviewed_at=NULL,
     review_reason='Reverification required: submit global identity KYC and business registration/photo evidence.'
 WHERE status='approved';
INSERT INTO resource_memberships(identity_subject,resource_type,resource_id,role,active)
 SELECT applicant_subject,'business',id,'owner',true FROM business_onboarding
 ON CONFLICT(identity_subject,resource_type,resource_id,role) DO UPDATE SET active=true;
REVOKE ALL ON account_kyc_verifications,account_kyc_documents FROM PUBLIC;
