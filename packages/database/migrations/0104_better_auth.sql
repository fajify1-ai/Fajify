-- Better Auth owns credentials and sessions; application tables own authorization.
CREATE TABLE auth_user (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, email_verified boolean NOT NULL DEFAULT false, image text, username text, phone_number text, date_of_birth text, home_address text, terms_accepted boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth_session (id text PRIMARY KEY, token text NOT NULL UNIQUE, user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), ip_address text, user_agent text);
CREATE INDEX auth_session_user_idx ON auth_session(user_id);
CREATE TABLE auth_account (id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL, user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE, access_token text, refresh_token text, id_token text, access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text, password text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider_id,account_id));
CREATE INDEX auth_account_user_idx ON auth_account(user_id);
CREATE TABLE auth_verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX auth_verification_identifier_idx ON auth_verification(identifier);
CREATE TABLE auth_rate_limit (id text PRIMARY KEY, key text NOT NULL UNIQUE, count integer NOT NULL, last_request bigint NOT NULL);
-- Operator-managed coarse roles. API runtime must only SELECT this table.
CREATE TABLE application_roles (identity_subject varchar(255) NOT NULL, role varchar(32) NOT NULL CHECK(role IN ('customer','merchant','driver','dispatcher','platform-admin')), PRIMARY KEY(identity_subject,role));
-- Customer enrollment is atomic with identity creation, including cleanup on failure.
CREATE FUNCTION provision_auth_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ BEGIN
 INSERT INTO user_profiles(identity_subject,display_name,suspended,phone_number,date_of_birth,home_address,terms_accepted_at) VALUES(NEW.id,NEW.name,false,NEW.phone_number,NULLIF(NEW.date_of_birth,'')::date,NEW.home_address,CASE WHEN NEW.terms_accepted THEN now() END);
 INSERT INTO account_access(identity_subject,suspended) VALUES(NEW.id,false);
 INSERT INTO application_roles(identity_subject,role) VALUES(NEW.id,'customer');
 RETURN NEW;
END $$;
CREATE TRIGGER auth_customer_created AFTER INSERT ON auth_user FOR EACH ROW EXECUTE FUNCTION provision_auth_customer();
REVOKE ALL ON auth_user,auth_session,auth_account,auth_verification,auth_rate_limit,application_roles FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_auth_customer() FROM PUBLIC;
