-- Business identity, explicit verification state, and protected onboarding provenance.
-- No business is implicitly approved through realm roles or resource memberships.
CREATE TABLE business_onboarding (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 applicant_subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 display_name varchar(120) NOT NULL CHECK(length(btrim(display_name)) BETWEEN 2 AND 120),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewer_subject varchar(255),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='pending' AND reviewer_subject IS NULL AND reviewed_at IS NULL)
    OR (status<>'pending' AND reviewer_subject IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX business_onboarding_applicant_idx ON business_onboarding(applicant_subject,created_at DESC);
REVOKE ALL ON business_onboarding FROM PUBLIC;
