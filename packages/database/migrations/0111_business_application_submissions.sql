-- Immutable review snapshots; saving a draft never mutates a submitted application.
CREATE TABLE web_business_submissions (
 application_id uuid PRIMARY KEY REFERENCES business_onboarding(id),
 subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 draft_revision integer NOT NULL CHECK(draft_revision>0),
 content_hash char(64) NOT NULL,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(subject,content_hash)
);
