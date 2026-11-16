-- Run as a disposable database owner with CREATEROLE. All changes roll back.
DO $$ BEGIN
 IF current_database() !~ '^fajify_auth_test' THEN RAISE EXCEPTION 'Disposable auth test database required'; END IF;
END $$;
BEGIN;
CREATE ROLE faji_auth_restricted;
GRANT USAGE ON SCHEMA public TO faji_auth_restricted;
GRANT SELECT,INSERT,UPDATE,DELETE ON auth_user,auth_session,auth_account,auth_verification,auth_rate_limit TO faji_auth_restricted;
GRANT SELECT ON application_roles TO faji_auth_restricted;
SET LOCAL ROLE faji_auth_restricted;
INSERT INTO auth_user(id,name,email) VALUES('restricted-probe','Restricted Probe','restricted-probe@example.test');
DO $$ BEGIN
 IF (SELECT count(*) FROM application_roles WHERE identity_subject='restricted-probe' AND role='customer')<>1 THEN RAISE EXCEPTION 'Customer provisioning failed'; END IF;
 BEGIN
  INSERT INTO application_roles(identity_subject,role) VALUES('restricted-probe','platform-admin');
  RAISE EXCEPTION 'Runtime role can self-grant admin';
 EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'PASS: owner trigger provisions customer; runtime cannot grant admin';
 END;
END $$;
ROLLBACK;
