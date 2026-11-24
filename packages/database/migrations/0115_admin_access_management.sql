CREATE TABLE platform_admin_owner (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton=true),
 identity_subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 configured_by varchar(255) NOT NULL,
 configured_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON platform_admin_owner FROM PUBLIC;

CREATE FUNCTION faji_admin_set_access(
 p_actor_subject varchar,
 p_target_subject varchar,
 p_is_admin boolean,
 p_scopes varchar[],
 p_reason varchar
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
 actor_valid boolean;
 target_valid boolean;
 existing_admin boolean;
 existing_scopes varchar[];
 changed boolean;
BEGIN
 IF p_actor_subject IS NULL OR length(btrim(p_actor_subject)) NOT BETWEEN 1 AND 255
    OR p_target_subject IS NULL OR length(btrim(p_target_subject)) NOT BETWEEN 1 AND 255
    OR p_actor_subject = p_target_subject
    OR p_is_admin IS NULL
    OR p_scopes IS NULL
    OR cardinality(p_scopes) > 15
    OR cardinality(p_scopes) <> (SELECT count(DISTINCT scope) FROM unnest(p_scopes) AS scopes(scope))
    OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 8 AND 500
 THEN
   RAISE EXCEPTION 'Invalid platform administrator access command';
 END IF;

 IF EXISTS (
   SELECT 1 FROM unnest(p_scopes) AS requested(scope)
   WHERE requested.scope NOT IN (
     'operations.read','audit.read','governance.read','governance.write','identity.write',
     'finance.read','finance.write','support.read','support.write','integrations.read',
     'reports.read','monitoring.read','incidents.write','waitlist.read','business_waitlist.read'
   )
 ) OR (NOT p_is_admin AND cardinality(p_scopes) <> 0) THEN
   RAISE EXCEPTION 'Invalid platform administrator scope set';
 END IF;

 SELECT EXISTS (
   SELECT 1 FROM auth_user u
   JOIN platform_admin_owner owner ON owner.singleton=true AND owner.identity_subject=u.id
   JOIN application_roles r ON r.identity_subject=u.id AND r.role='platform-admin'
   JOIN account_access a ON a.identity_subject=u.id AND a.suspended=false AND a.revoked_after IS NULL
   JOIN user_profiles p ON p.identity_subject=u.id AND p.suspended=false
   WHERE u.id=p_actor_subject AND u.email_verified=true
 ) INTO actor_valid;
 IF NOT actor_valid THEN
   RAISE EXCEPTION 'Active verified platform administrator actor required';
 END IF;

 SELECT EXISTS (
   SELECT 1 FROM auth_user u
   JOIN account_access a ON a.identity_subject=u.id
   JOIN user_profiles p ON p.identity_subject=u.id
   WHERE u.id=p_target_subject
     AND u.email_verified=true
     AND a.suspended=false
     AND a.revoked_after IS NULL
     AND p.suspended=false
 ) INTO target_valid;
 IF p_is_admin AND NOT target_valid THEN
   RAISE EXCEPTION 'Target must be a verified, active account';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth_user WHERE id=p_target_subject) THEN
   RAISE EXCEPTION 'Target account not found';
 END IF;

 SELECT EXISTS (
   SELECT 1 FROM application_roles WHERE identity_subject=p_target_subject AND role='platform-admin'
 ) INTO existing_admin;
 SELECT coalesce(array_agg(scope ORDER BY scope),ARRAY[]::varchar[])
 INTO existing_scopes
 FROM admin_scope_grants
 WHERE identity_subject=p_target_subject AND active=true;

 changed := existing_admin IS DISTINCT FROM p_is_admin
   OR existing_scopes IS DISTINCT FROM (SELECT coalesce(array_agg(scope ORDER BY scope),ARRAY[]::varchar[]) FROM unnest(p_scopes) AS requested(scope));

 IF p_is_admin THEN
   INSERT INTO application_roles(identity_subject,role)
   VALUES(p_target_subject,'platform-admin')
   ON CONFLICT(identity_subject,role) DO NOTHING;

   UPDATE admin_scope_grants
   SET active=false,granted_by=p_actor_subject,granted_at=now()
   WHERE identity_subject=p_target_subject
     AND active=true
     AND scope <> ALL(p_scopes);

   INSERT INTO admin_scope_grants(identity_subject,scope,granted_by)
   SELECT p_target_subject,requested.scope,p_actor_subject
   FROM unnest(p_scopes) AS requested(scope)
   ON CONFLICT(identity_subject,scope)
   DO UPDATE SET active=true,granted_by=EXCLUDED.granted_by,granted_at=now()
   WHERE admin_scope_grants.active=false;
 ELSE
   UPDATE admin_scope_grants
   SET active=false,granted_by=p_actor_subject,granted_at=now()
   WHERE identity_subject=p_target_subject AND active=true;
   DELETE FROM application_roles
   WHERE identity_subject=p_target_subject AND role='platform-admin';
 END IF;

 RETURN changed;
END;
$$;
REVOKE ALL ON FUNCTION faji_admin_set_access(varchar,varchar,boolean,varchar[],varchar) FROM PUBLIC;
