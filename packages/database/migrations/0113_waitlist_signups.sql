ALTER TABLE admin_scope_grants DROP CONSTRAINT admin_scope_grants_scope_check;
ALTER TABLE admin_scope_grants ADD CONSTRAINT admin_scope_grants_scope_check CHECK(scope IN (
 'operations.read','audit.read','governance.read','governance.write','identity.write',
 'finance.read','finance.write','support.read','support.write','integrations.read',
 'reports.read','monitoring.read','incidents.write','waitlist.read'
));

CREATE TABLE waitlist_signups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email varchar(254) NOT NULL,
 email_normalized varchar(254) NOT NULL UNIQUE,
 whatsapp varchar(16) NOT NULL CHECK(whatsapp ~ '^\+234[0-9]{10}$'),
 consent_version varchar(32) NOT NULL,
 consented_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(email=email_normalized AND email_normalized=lower(email_normalized))
);
CREATE INDEX waitlist_signups_created_idx ON waitlist_signups(created_at DESC,id DESC);
REVOKE ALL ON waitlist_signups FROM PUBLIC;

CREATE TABLE waitlist_rate_buckets (
 client_key char(64) PRIMARY KEY CHECK(client_key ~ '^[a-f0-9]{64}$'),
 window_start bigint NOT NULL,
 used integer NOT NULL CHECK(used>0)
);
REVOKE ALL ON waitlist_rate_buckets FROM PUBLIC;
