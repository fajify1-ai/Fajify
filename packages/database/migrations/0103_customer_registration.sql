-- Customer self-registration profile data. Credentials remain in Keycloak.
ALTER TABLE user_profiles
 ADD COLUMN phone_number varchar(32),
 ADD COLUMN date_of_birth date,
 ADD COLUMN home_address varchar(500),
 ADD COLUMN terms_accepted_at timestamptz;

CREATE TABLE customer_registration_limits (
 bucket_hash varchar(64) PRIMARY KEY,
 window_started timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL CHECK (attempts > 0)
);
REVOKE ALL ON customer_registration_limits FROM PUBLIC;
