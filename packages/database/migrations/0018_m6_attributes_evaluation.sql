ALTER TABLE customer_plans ADD COLUMN attributes text[] NOT NULL DEFAULT '{}';
ALTER TABLE customer_plans ADD CONSTRAINT customer_plans_attributes_limit CHECK(cardinality(attributes)<=8);
CREATE TABLE customer_plan_evaluations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES customer_plans(id) ON DELETE CASCADE,
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 revision integer NOT NULL CHECK(revision>0),
 eligible_count integer NOT NULL CHECK(eligible_count BETWEEN 0 AND 500),
 returned_count integer NOT NULL CHECK(returned_count BETWEEN 0 AND 50),
 evaluated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(returned_count<=eligible_count)
);
CREATE INDEX customer_plan_evaluations_owner_idx ON customer_plan_evaluations(customer_subject,plan_id,evaluated_at DESC);
REVOKE ALL ON customer_plan_evaluations FROM PUBLIC;
