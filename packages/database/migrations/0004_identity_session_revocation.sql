-- Persist Keycloak session revocation across API instances and process restarts.
-- No Keycloak credentials or refresh tokens are stored in the application database.
CREATE TABLE revoked_identity_sessions (
 identity_subject varchar(255) NOT NULL,
 session_id varchar(255) NOT NULL,
 revoked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(identity_subject,session_id)
);
REVOKE ALL ON revoked_identity_sessions FROM PUBLIC;
