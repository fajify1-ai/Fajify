-- M6-P1 additive hardening; never modify migration 0015 after application.
ALTER TABLE customer_plans
 ADD COLUMN latitude double precision,
 ADD COLUMN longitude double precision,
 ADD COLUMN radius_km integer,
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 ADD CONSTRAINT customer_plans_coordinates_pair CHECK ((latitude IS NULL)=(longitude IS NULL)),
 ADD CONSTRAINT customer_plans_latitude_range CHECK(latitude BETWEEN -90 AND 90),
 ADD CONSTRAINT customer_plans_longitude_range CHECK(longitude BETWEEN -180 AND 180),
 ADD CONSTRAINT customer_plans_radius_range CHECK(radius_km BETWEEN 1 AND 100),
 ADD CONSTRAINT customer_plans_radius_requires_coordinates CHECK(radius_km IS NULL OR latitude IS NOT NULL);
CREATE TABLE customer_plan_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plan_id uuid NOT NULL REFERENCES customer_plans(id) ON DELETE CASCADE,
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment varchar(500),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(plan_id,customer_subject)
);
CREATE INDEX customer_plan_feedback_owner_idx ON customer_plan_feedback(customer_subject,created_at DESC,id DESC);
REVOKE ALL ON customer_plans,customer_plan_feedback FROM PUBLIC;
