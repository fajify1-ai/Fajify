-- Pre-launch: no real users or imported identities exist. Keep applied checksums immutable.
DROP TRIGGER legacy_credential_guard ON auth_account;
DROP FUNCTION protect_legacy_credential();
DROP FUNCTION consume_identity_claim(text,text,text);
CREATE OR REPLACE FUNCTION provision_auth_customer() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM user_profiles WHERE identity_subject=NEW.id) THEN RAISE EXCEPTION 'Identity collision'; END IF;
 INSERT INTO user_profiles(identity_subject,display_name,suspended,phone_number,date_of_birth,home_address,terms_accepted_at)
 VALUES(NEW.id,NEW.name,false,NEW.registration_phone,NULLIF(NEW.date_of_birth,'')::date,NEW.home_address,CASE WHEN NEW.terms_accepted THEN now() END);
 INSERT INTO account_access(identity_subject,suspended) VALUES(NEW.id,false);
 INSERT INTO application_roles(identity_subject,role) VALUES(NEW.id,'customer');
 RETURN NEW;
END $$;
DROP TABLE auth_legacy_claims,auth_claim_attempts;
