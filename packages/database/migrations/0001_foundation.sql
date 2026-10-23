-- Application database only. Keycloak uses its own independent PostgreSQL database.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS user_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_subject varchar(255) NOT NULL UNIQUE,
 display_name varchar(120),
 suspended boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_subject varchar(255),
 action varchar(120) NOT NULL,
 resource_type varchar(80) NOT NULL,
 resource_id uuid,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_occurred_at_idx ON audit_events(occurred_at);
CREATE TABLE IF NOT EXISTS outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_type varchar(120) NOT NULL,
 payload text NOT NULL,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox_events(published_at,created_at) WHERE published_at IS NULL;
