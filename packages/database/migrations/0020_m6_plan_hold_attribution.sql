-- M6-P1: synthetic-safe conversion attribution. Financial truth remains in M5.
CREATE TABLE customer_plan_hold_links (
 hold_id uuid PRIMARY KEY REFERENCES paid_holds(id),
 plan_id uuid NOT NULL REFERENCES customer_plans(id),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 plan_revision integer NOT NULL CHECK(plan_revision>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_plan_hold_links_owner_idx ON customer_plan_hold_links(customer_subject,plan_id,created_at DESC);
REVOKE ALL ON customer_plan_hold_links FROM PUBLIC;
