-- M4 owns public venue metadata and customer account workflows, not payments/tickets.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE business_public_profiles (
 branch_id uuid PRIMARY KEY,
 business_id uuid NOT NULL,
 summary varchar(2000) NOT NULL DEFAULT '',
 city varchar(120) NOT NULL DEFAULT '',
 public_phone varchar(40),
 latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 location geography(Point,4326) GENERATED ALWAYS AS (
  CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
   THEN ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography ELSE NULL END
 ) STORED,
 CHECK((latitude IS NULL)=(longitude IS NULL)),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id)
);
CREATE INDEX business_public_profiles_geo_idx ON business_public_profiles USING gist(location);
CREATE INDEX business_catalogue_public_name_idx ON business_catalogue USING gin(name gin_trgm_ops) WHERE active AND published;
CREATE INDEX business_branches_address_search_idx ON business_branches USING gin(address gin_trgm_ops) WHERE active;
CREATE TABLE business_public_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 catalogue_id uuid,
 url varchar(2048) NOT NULL CHECK(url LIKE 'https://%'),
 alt varchar(160) NOT NULL CHECK(length(btrim(alt)) BETWEEN 1 AND 160),
 position integer NOT NULL CHECK(position BETWEEN 0 AND 19),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE UNIQUE INDEX business_public_media_branch_position_idx ON business_public_media(branch_id,position) WHERE catalogue_id IS NULL;
CREATE UNIQUE INDEX business_public_media_item_position_idx ON business_public_media(catalogue_id,position) WHERE catalogue_id IS NOT NULL;
CREATE TABLE business_public_packages (
 catalogue_id uuid PRIMARY KEY,
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 pricing_model varchar(16) NOT NULL CHECK(pricing_model IN ('per_group','per_guest')),
 min_guests integer NOT NULL CHECK(min_guests BETWEEN 1 AND 10000),
 max_guests integer NOT NULL CHECK(max_guests BETWEEN min_guests AND 10000),
 FOREIGN KEY(catalogue_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE TABLE business_package_addons (
 package_id uuid NOT NULL REFERENCES business_public_packages(catalogue_id),
 addon_id uuid NOT NULL,
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 max_quantity integer NOT NULL CHECK(max_quantity BETWEEN 1 AND 10000),
 PRIMARY KEY(package_id,addon_id),
 CHECK(package_id<>addon_id),
 FOREIGN KEY(package_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id),
 FOREIGN KEY(addon_id,business_id,branch_id) REFERENCES business_catalogue(id,business_id,branch_id)
);
CREATE TABLE customer_wishlist (
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 catalogue_id uuid NOT NULL REFERENCES business_catalogue(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_subject,catalogue_id)
);
CREATE INDEX customer_wishlist_history_idx ON customer_wishlist(customer_subject,created_at DESC,catalogue_id);
ALTER TABLE business_reservations ADD CONSTRAINT business_reservations_id_scope_key UNIQUE(id,business_id,branch_id);
CREATE TABLE customer_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 business_id uuid NOT NULL,
 branch_id uuid NOT NULL,
 reservation_id uuid UNIQUE,
 order_id uuid UNIQUE,
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 body varchar(2000) NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),
 withdrawn boolean NOT NULL DEFAULT false,
 moderation_status varchar(16) NOT NULL DEFAULT 'visible' CHECK(moderation_status IN ('visible','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((reservation_id IS NULL)<>(order_id IS NULL)),
 FOREIGN KEY(branch_id,business_id) REFERENCES business_branches(id,business_id),
 FOREIGN KEY(reservation_id,business_id,branch_id) REFERENCES business_reservations(id,business_id,branch_id),
 FOREIGN KEY(order_id,business_id,branch_id) REFERENCES business_orders(id,business_id,branch_id)
);
CREATE INDEX customer_reviews_public_idx ON customer_reviews(branch_id,created_at DESC,id) WHERE NOT withdrawn AND moderation_status='visible';
CREATE INDEX customer_reviews_private_idx ON customer_reviews(customer_subject,created_at DESC,id);
CREATE TABLE customer_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 resource_type varchar(16) NOT NULL CHECK(resource_type IN ('reservation','order')),
 resource_id uuid NOT NULL,
 status varchar(16) NOT NULL,
 title varchar(120) NOT NULL,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(resource_type,resource_id,status)
);
CREATE INDEX customer_notifications_history_idx ON customer_notifications(customer_subject,created_at DESC,id);
CREATE INDEX customer_notifications_unread_idx ON customer_notifications(customer_subject) WHERE read_at IS NULL;
-- In-app events commit with both M3 merchant transitions and M4 customer writes.
-- Legacy merchant-assisted subjects without a Faji profile are intentionally ignored.
CREATE FUNCTION faji_customer_notification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 END IF;
 INSERT INTO customer_notifications(customer_subject,resource_type,resource_id,status,title)
 SELECT NEW.customer_subject,TG_ARGV[0],NEW.id,NEW.status,
  CASE WHEN TG_ARGV[0]='order' THEN 'Order ' ELSE 'Reservation ' END || replace(NEW.status,'_',' ')
 WHERE EXISTS(SELECT 1 FROM user_profiles WHERE identity_subject=NEW.customer_subject)
 ON CONFLICT(resource_type,resource_id,status) DO NOTHING;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION faji_customer_notification() FROM PUBLIC;
CREATE TRIGGER customer_order_notification AFTER INSERT OR UPDATE OF status ON business_orders
 FOR EACH ROW EXECUTE FUNCTION faji_customer_notification('order');
CREATE TRIGGER customer_reservation_notification AFTER INSERT OR UPDATE OF status ON business_reservations
 FOR EACH ROW EXECUTE FUNCTION faji_customer_notification('reservation');
CREATE TABLE customer_support_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 fingerprint char(64) NOT NULL,
 category varchar(16) NOT NULL CHECK(category IN ('reservation','order','account','other')),
 resource_id uuid,
 subject varchar(160) NOT NULL CHECK(length(btrim(subject)) BETWEEN 1 AND 160),
 status varchar(16) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((category IN ('reservation','order'))=(resource_id IS NOT NULL)),
 UNIQUE(customer_subject,request_key)
);
CREATE INDEX customer_support_history_idx ON customer_support_cases(customer_subject,created_at DESC,id);
CREATE TABLE customer_support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES customer_support_cases(id),
 request_key varchar(100) NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,100}$'),
 body varchar(4000) NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(case_id,request_key)
);
CREATE INDEX customer_support_messages_case_idx ON customer_support_messages(case_id,created_at,id);
CREATE TABLE customer_request_buckets (
 customer_subject varchar(255) NOT NULL REFERENCES user_profiles(identity_subject),
 bucket varchar(24) NOT NULL,
 window_start bigint NOT NULL,
 used integer NOT NULL CHECK(used>0),
 PRIMARY KEY(customer_subject,bucket)
);
REVOKE ALL ON business_public_profiles,business_public_media,business_public_packages,business_package_addons,
 customer_wishlist,customer_reviews,customer_notifications,customer_support_cases,customer_support_messages,customer_request_buckets FROM PUBLIC;
