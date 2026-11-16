-- Password mutation and revocation are atomic even if message delivery or callbacks fail.
CREATE FUNCTION revoke_sessions_on_password_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
 DELETE FROM auth_session WHERE user_id=NEW.user_id;
 INSERT INTO identity_security_events(actor_subject,event_type) VALUES(NEW.user_id,'credential_password_changed');
 RETURN NEW;
END $$;
CREATE TRIGGER password_session_revoke AFTER UPDATE OF password ON auth_account FOR EACH ROW WHEN(NEW.provider_id='credential' AND OLD.password IS DISTINCT FROM NEW.password) EXECUTE FUNCTION revoke_sessions_on_password_change();
REVOKE EXECUTE ON FUNCTION revoke_sessions_on_password_change() FROM PUBLIC;
