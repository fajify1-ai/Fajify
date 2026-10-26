-- Faji application authorization; Keycloak credentials and sessions remain in its separate database.
CREATE TABLE account_access (
 identity_subject varchar(255) PRIMARY KEY,
 suspended boolean NOT NULL DEFAULT false,
 revoked_after timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resource_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_subject varchar(255) NOT NULL,
 resource_type varchar(32) NOT NULL CHECK (resource_type IN ('business','branch','dispatch_area')),
 resource_id uuid NOT NULL,
 role varchar(32) NOT NULL CHECK (role IN ('owner','manager','staff','driver','dispatcher')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(identity_subject,resource_type,resource_id,role)
);
CREATE INDEX resource_memberships_lookup_idx ON resource_memberships(identity_subject,resource_type,resource_id) WHERE active;
CREATE TABLE identity_security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_subject varchar(255),
 event_type varchar(64) NOT NULL,
 details varchar(240),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_security_events_time_idx ON identity_security_events(occurred_at);
REVOKE ALL ON account_access,resource_memberships,identity_security_events FROM PUBLIC;
