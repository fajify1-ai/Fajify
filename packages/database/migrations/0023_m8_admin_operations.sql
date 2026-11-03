-- M8-P1 additive administration data. Apply only after M1-M6 migrations.
-- Scope grants are operator-owned; the API runtime has SELECT only.
CREATE TABLE admin_scope_grants (
 identity_subject varchar(255) NOT NULL REFERENCES account_access(identity_subject),
 scope varchar(32) NOT NULL CHECK(scope IN (
  'operations.read','audit.read','governance.read','governance.write',
  'finance.read','support.read','support.write','integrations.read',
  'reports.read','monitoring.read','incidents.write'
 )),
 active boolean NOT NULL DEFAULT true,
 granted_by varchar(255) NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(identity_subject,scope)
);
REVOKE ALL ON admin_scope_grants FROM PUBLIC;

CREATE TABLE admin_action_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_subject varchar(255) NOT NULL CHECK(length(btrim(actor_subject))>0),
 operation varchar(80) NOT NULL,
 resource_type varchar(32) NOT NULL,
 resource_id varchar(255) NOT NULL,
 outcome varchar(16) NOT NULL CHECK(outcome IN ('applied','unchanged')),
 reason varchar(500),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_action_events_history_idx ON admin_action_events(occurred_at DESC,id DESC);
CREATE INDEX admin_action_events_resource_idx ON admin_action_events(resource_type,resource_id,occurred_at DESC);
CREATE TRIGGER admin_action_events_immutable BEFORE UPDATE OR DELETE ON admin_action_events
 FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
REVOKE ALL ON admin_action_events FROM PUBLIC;

-- A single actor/requestKey can only identify one exact administrative command.
CREATE TABLE admin_command_receipts (
 actor_subject varchar(255) NOT NULL,
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 fingerprint char(64) NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 operation varchar(80) NOT NULL,
 resource_type varchar(32) NOT NULL,
 resource_id varchar(255) NOT NULL,
 result_json jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor_subject,request_key)
);
CREATE TRIGGER admin_command_receipts_immutable BEFORE UPDATE OR DELETE ON admin_command_receipts
 FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
REVOKE ALL ON admin_command_receipts FROM PUBLIC;

-- Active restrictions are separate from merchant-owned active/published flags.
-- A database trigger blocks reactivation by ordinary merchant APIs or direct SQL.
CREATE TABLE admin_marketplace_restrictions (
 resource_type varchar(16) NOT NULL CHECK(resource_type IN ('branch','catalogue')),
 resource_id uuid NOT NULL,
 restricted boolean NOT NULL,
 prior_enabled boolean NOT NULL,
 reason varchar(500) NOT NULL,
 changed_by varchar(255) NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(resource_type,resource_id)
);
CREATE FUNCTION m8_prevent_restricted_reactivation() RETURNS trigger
 LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='business_branches' AND NEW.active AND NOT OLD.active
  AND EXISTS(SELECT 1 FROM admin_marketplace_restrictions
    WHERE resource_type='branch' AND resource_id=NEW.id AND restricted)
 THEN RAISE EXCEPTION 'M8: administrative branch restriction is active'; END IF;
 IF TG_TABLE_NAME='business_catalogue' AND NEW.published AND NOT OLD.published
  AND EXISTS(SELECT 1 FROM admin_marketplace_restrictions
    WHERE resource_type='catalogue' AND resource_id=NEW.id AND restricted)
 THEN RAISE EXCEPTION 'M8: administrative catalogue restriction is active'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION m8_prevent_restricted_reactivation() FROM PUBLIC;
CREATE TRIGGER m8_branch_reactivation BEFORE UPDATE OF active ON business_branches
 FOR EACH ROW EXECUTE FUNCTION m8_prevent_restricted_reactivation();
CREATE TRIGGER m8_catalogue_republication BEFORE UPDATE OF published ON business_catalogue
 FOR EACH ROW EXECUTE FUNCTION m8_prevent_restricted_reactivation();
REVOKE ALL ON admin_marketplace_restrictions FROM PUBLIC;

-- M4 customer support remains the authority for customer-visible case status/messages.
ALTER TABLE customer_support_cases
 ADD COLUMN assigned_to varchar(255),
 ADD COLUMN priority varchar(8) NOT NULL DEFAULT 'normal'
  CHECK(priority IN ('low','normal','high','urgent'));
CREATE INDEX customer_support_admin_queue_idx
 ON customer_support_cases(status,priority,updated_at DESC,id DESC);
ALTER TABLE customer_support_messages
 ADD COLUMN author_kind varchar(8) NOT NULL DEFAULT 'customer'
  CHECK(author_kind IN ('customer','admin')),
 ADD COLUMN author_subject varchar(255);

-- Operator incidents are private, not public customer support messages.
CREATE TABLE admin_incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 incident_type varchar(16) NOT NULL CHECK(incident_type IN ('booking','order','ride','provider','security','platform')),
 resource_id uuid,
 summary varchar(200) NOT NULL CHECK(length(btrim(summary)) BETWEEN 8 AND 200),
 severity varchar(8) NOT NULL CHECK(severity IN ('low','medium','high','critical')),
 state varchar(16) NOT NULL DEFAULT 'open' CHECK(state IN ('open','investigating','mitigated','resolved')),
 assigned_to varchar(255),
 created_by varchar(255) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_incidents_queue_idx ON admin_incidents(state,severity,updated_at DESC,id DESC);
REVOKE ALL ON admin_incidents FROM PUBLIC;

-- Signal deduplication is independent of notification delivery.
CREATE TABLE admin_monitor_signals (
 signal_key varchar(80) PRIMARY KEY,
 incident_id uuid REFERENCES admin_incidents(id),
 active boolean NOT NULL DEFAULT false,
 last_checked_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON admin_monitor_signals FROM PUBLIC;

-- Persistent admin-inbox alerts, not claims of email/push provider delivery.
CREATE TABLE admin_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 incident_id uuid NOT NULL UNIQUE REFERENCES admin_incidents(id),
 severity varchar(8) NOT NULL CHECK(severity IN ('low','medium','high','critical')),
 acknowledged_by varchar(255),
 acknowledged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((acknowledged_by IS NULL)=(acknowledged_at IS NULL))
);
CREATE INDEX admin_alerts_unread_idx ON admin_alerts(created_at DESC,id DESC) WHERE acknowledged_at IS NULL;
REVOKE ALL ON admin_alerts FROM PUBLIC;

-- Scope changes are operator-controlled and recorded atomically.
CREATE TABLE admin_scope_grant_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_subject varchar(255) NOT NULL,
 scope varchar(32) NOT NULL,
 active boolean NOT NULL,
 granted_by varchar(255) NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_scope_grant_events_time_idx ON admin_scope_grant_events(occurred_at DESC,id DESC);
CREATE TRIGGER admin_scope_grant_events_immutable BEFORE UPDATE OR DELETE ON admin_scope_grant_events
 FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE FUNCTION m8_audit_scope_grant() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO admin_scope_grant_events(identity_subject,scope,active,granted_by)
 VALUES(NEW.identity_subject,NEW.scope,NEW.active,NEW.granted_by);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION m8_audit_scope_grant() FROM PUBLIC;
CREATE TRIGGER admin_scope_grant_audit AFTER INSERT OR UPDATE OF active,granted_by ON admin_scope_grants
 FOR EACH ROW EXECUTE FUNCTION m8_audit_scope_grant();
REVOKE ALL ON admin_scope_grant_events FROM PUBLIC;

-- Audit identities are never silently renamed or deleted. Revoke by setting active=false.
CREATE FUNCTION m8_scope_grant_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'M8: administrator scope grants cannot be deleted'; END IF;
 IF NEW.identity_subject IS DISTINCT FROM OLD.identity_subject OR NEW.scope IS DISTINCT FROM OLD.scope
 THEN RAISE EXCEPTION 'M8: administrator scope grant identity cannot change'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION m8_scope_grant_identity_guard() FROM PUBLIC;
CREATE TRIGGER admin_scope_grant_identity_guard BEFORE UPDATE OR DELETE ON admin_scope_grants
 FOR EACH ROW EXECUTE FUNCTION m8_scope_grant_identity_guard();
