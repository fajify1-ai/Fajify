-- Additive only: preserve applied migration 0104 and every domain identity reference.
ALTER TABLE auth_user ADD COLUMN registration_phone text, ADD COLUMN phone_number_verified boolean NOT NULL DEFAULT false, ADD COLUMN two_factor_enabled boolean NOT NULL DEFAULT false;
UPDATE auth_user SET registration_phone=phone_number,phone_number=NULL;
CREATE UNIQUE INDEX auth_user_phone_unique ON auth_user(phone_number) WHERE phone_number IS NOT NULL;
CREATE UNIQUE INDEX auth_user_email_case_unique ON auth_user(lower(email));
ALTER TABLE auth_session ADD COLUMN step_up_at timestamptz, ADD COLUMN mfa_verified_at timestamptz;
CREATE TABLE auth_two_factor(id text PRIMARY KEY,user_id text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,secret text NOT NULL,backup_codes text NOT NULL,verified boolean NOT NULL DEFAULT true,failed_verification_count integer NOT NULL DEFAULT 0,locked_until timestamptz);
CREATE INDEX auth_two_factor_user_idx ON auth_two_factor(user_id);
-- This table is owner-only. It never exposes claim hashes/evidence to API SQL reads.
CREATE TABLE auth_legacy_claims (
 identity_subject varchar(255) PRIMARY KEY REFERENCES account_access(identity_subject),
 email text NOT NULL UNIQUE, token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 expires_at timestamptz NOT NULL, claimed_at timestamptz, evidence jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_claim_attempts(bucket text PRIMARY KEY, attempts integer NOT NULL,window_started timestamptz NOT NULL DEFAULT now());
-- Keep the legacy subject as auth_user.id. No domain rows, grants or IDs are rewritten.
CREATE OR REPLACE FUNCTION provision_auth_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth_legacy_claims WHERE identity_subject=NEW.id AND lower(email)=lower(NEW.email)) THEN
  IF NOT EXISTS(SELECT 1 FROM user_profiles WHERE identity_subject=NEW.id) THEN RAISE EXCEPTION 'Legacy profile missing'; END IF;
  RETURN NEW;
 END IF;
 IF EXISTS(SELECT 1 FROM user_profiles WHERE identity_subject=NEW.id) THEN RAISE EXCEPTION 'Identity collision'; END IF;
 INSERT INTO user_profiles(identity_subject,display_name,suspended,phone_number,date_of_birth,home_address,terms_accepted_at)
 VALUES(NEW.id,NEW.name,false,NEW.registration_phone,NULLIF(NEW.date_of_birth,'')::date,NEW.home_address,CASE WHEN NEW.terms_accepted THEN now() END);
 INSERT INTO account_access(identity_subject,suspended) VALUES(NEW.id,false);
 INSERT INTO application_roles(identity_subject,role) VALUES(NEW.id,'customer');
 RETURN NEW;
END $$;
-- Runtime can consume a high entropy claim, but cannot issue one or choose its subject/roles.
CREATE FUNCTION consume_identity_claim(p_hash text,p_password text,p_bucket text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target auth_legacy_claims; n integer;
BEGIN
 INSERT INTO auth_claim_attempts(bucket,attempts) VALUES(p_bucket,1)
 ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_claim_attempts.window_started<now()-interval '15 minutes' THEN 1 ELSE auth_claim_attempts.attempts+1 END,window_started=CASE WHEN auth_claim_attempts.window_started<now()-interval '15 minutes' THEN now() ELSE auth_claim_attempts.window_started END RETURNING attempts INTO n;
 IF n>10 THEN RETURN false; END IF;
 SELECT * INTO target FROM auth_legacy_claims WHERE token_hash=p_hash FOR UPDATE;
 IF NOT FOUND OR target.claimed_at IS NOT NULL OR target.expires_at<=now() OR p_password IS NULL OR length(p_password)<32 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM auth_account WHERE user_id=target.identity_subject AND provider_id='credential') THEN RETURN false; END IF;
 UPDATE auth_legacy_claims SET claimed_at=now() WHERE identity_subject=target.identity_subject;
 INSERT INTO auth_account(id,account_id,provider_id,user_id,password) VALUES(gen_random_uuid()::text,target.identity_subject,'credential',target.identity_subject,p_password);
 DELETE FROM auth_session WHERE user_id=target.identity_subject;
 UPDATE auth_legacy_claims SET claimed_at=now() WHERE identity_subject=target.identity_subject;
 INSERT INTO identity_security_events(actor_subject,event_type) VALUES(target.identity_subject,'legacy_identity_claimed');
 RETURN true;
END $$;
REVOKE ALL ON auth_legacy_claims,auth_claim_attempts,auth_two_factor FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION consume_identity_claim(text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_auth_customer() FROM PUBLIC;

CREATE TABLE auth_sms_budgets(phone_hash text PRIMARY KEY,attempts integer NOT NULL,window_started timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON auth_sms_budgets FROM PUBLIC;
-- Recovery email possession alone must never claim an unclaimed legacy identity.
CREATE FUNCTION protect_legacy_credential() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth_legacy_claims WHERE identity_subject=NEW.user_id AND claimed_at IS NULL) THEN RAISE EXCEPTION 'Independent identity claim required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER legacy_credential_guard BEFORE INSERT ON auth_account FOR EACH ROW EXECUTE FUNCTION protect_legacy_credential();
REVOKE EXECUTE ON FUNCTION protect_legacy_credential() FROM PUBLIC;

-- Enrolling or revoking a factor invalidates every pre-change session. Better Auth rotates
-- the verified current session after the change, so no pre-enrollment bearer survives.
CREATE FUNCTION revoke_sessions_on_mfa_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 DELETE FROM auth_session WHERE user_id=NEW.id;
 INSERT INTO identity_security_events(actor_subject,event_type) VALUES(NEW.id,CASE WHEN NEW.two_factor_enabled THEN 'mfa_enrolled' ELSE 'mfa_revoked' END);
 RETURN NEW;
END $$;
CREATE TRIGGER mfa_session_revoke AFTER UPDATE OF two_factor_enabled ON auth_user FOR EACH ROW WHEN(OLD.two_factor_enabled IS DISTINCT FROM NEW.two_factor_enabled) EXECUTE FUNCTION revoke_sessions_on_mfa_change();
REVOKE EXECUTE ON FUNCTION revoke_sessions_on_mfa_change() FROM PUBLIC;
