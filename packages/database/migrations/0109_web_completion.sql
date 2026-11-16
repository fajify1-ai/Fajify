-- Web journey state is separate from immutable finance and booking records.
CREATE TABLE web_onboarding_drafts (
 subject varchar(255) PRIMARY KEY REFERENCES account_access(identity_subject),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_verification_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES business_onboarding(id),
 subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 name varchar(120) NOT NULL, mime varchar(32) NOT NULL CHECK(mime IN ('image/jpeg','image/png','application/pdf')),
 ciphertext bytea NOT NULL, iv bytea NOT NULL CHECK(octet_length(iv)=12), tag bytea NOT NULL CHECK(octet_length(tag)=16),
 digest char(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(application_id,digest)
);
CREATE TABLE web_carts (subject varchar(255) PRIMARY KEY REFERENCES account_access(identity_subject), revision integer NOT NULL DEFAULT 1, items jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE web_customer_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 name varchar(120) NOT NULL, description varchar(2000) NOT NULL, location varchar(300) NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 10000),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE web_event_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES web_customer_events(id),
 subject varchar(255) NOT NULL REFERENCES account_access(identity_subject), token_hash char(64) UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',accepted_subject varchar(255) REFERENCES account_access(identity_subject),accepted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_merchant_promotions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL REFERENCES business_onboarding(id),
 title varchar(120) NOT NULL,description varchar(2000) NOT NULL,expires_at timestamptz NOT NULL,
 active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_merchant_support (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL REFERENCES business_onboarding(id),
 subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),title varchar(160) NOT NULL,
 status varchar(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_merchant_support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES web_merchant_support(id),
 subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),body varchar(4000) NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE web_merchant_notification_reads (
 business_id uuid NOT NULL REFERENCES business_onboarding(id),subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 notification_id varchar(100) NOT NULL,read_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(business_id,subject,notification_id)
);
CREATE INDEX web_events_owner ON web_customer_events(subject,created_at DESC);
CREATE INDEX web_support_business ON web_merchant_support(business_id,created_at DESC);
CREATE INDEX web_promotions_business ON web_merchant_promotions(business_id,created_at DESC);
REVOKE ALL ON web_onboarding_drafts,web_verification_documents,web_carts,web_customer_events,web_event_invitations,web_merchant_promotions,web_merchant_support,web_merchant_support_messages,web_merchant_notification_reads FROM PUBLIC;
