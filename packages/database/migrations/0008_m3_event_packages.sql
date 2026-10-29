-- M3-P1: event/package configuration; ticket sale/redemption belongs to M5.
CREATE TABLE business_event_config (
 catalogue_id uuid PRIMARY KEY,
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 max_guests integer NOT NULL CHECK(max_guests>0),
 CHECK(ends_at>starts_at),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE TABLE business_package_components (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 package_id uuid NOT NULL,
 component_id uuid NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0),
 CHECK(package_id<>component_id),
 UNIQUE(package_id,component_id),
 FOREIGN KEY(package_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id),
 FOREIGN KEY(component_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE INDEX business_package_components_scope_idx ON business_package_components(business_id,branch_id,package_id);
REVOKE ALL ON business_event_config,business_package_components FROM PUBLIC;
