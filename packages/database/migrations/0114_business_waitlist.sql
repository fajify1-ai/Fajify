ALTER TABLE admin_scope_grants DROP CONSTRAINT admin_scope_grants_scope_check;
ALTER TABLE admin_scope_grants ADD CONSTRAINT admin_scope_grants_scope_check CHECK(scope IN (
 'operations.read','audit.read','governance.read','governance.write','identity.write',
 'finance.read','finance.write','support.read','support.write','integrations.read',
 'reports.read','monitoring.read','incidents.write','waitlist.read','business_waitlist.read'
));

CREATE TABLE business_waitlist_signups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_name varchar(120) NOT NULL CHECK(length(btrim(business_name)) BETWEEN 2 AND 120),
 category varchar(32) NOT NULL CHECK(category IN (
  'party_event_organizer','restaurant_lounge','event_venue','fun_recreation','other'
 )),
 email varchar(254) NOT NULL,
 email_normalized varchar(254) NOT NULL UNIQUE,
 whatsapp varchar(16) NOT NULL CHECK(whatsapp ~ '^\+234[0-9]{10}$'),
 consent_version varchar(40) NOT NULL,
 consented_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(email=email_normalized AND email_normalized=lower(email))
);
CREATE INDEX business_waitlist_signups_created_idx ON business_waitlist_signups(created_at DESC,id DESC);
REVOKE ALL ON business_waitlist_signups FROM PUBLIC;
