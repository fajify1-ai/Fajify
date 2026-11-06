-- Bind payment evidence to an existing authoritative M4 order. Does not assert payment.
CREATE TABLE payment_order_links (
 order_id uuid PRIMARY KEY REFERENCES business_orders(id) ON DELETE RESTRICT,
 intent_id uuid NOT NULL UNIQUE REFERENCES payment_intents(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION m5_bind_order_intent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE purchase business_orders%ROWTYPE; payment payment_intents%ROWTYPE;
BEGIN
 SELECT * INTO purchase FROM business_orders WHERE id=NEW.order_id FOR SHARE;
 SELECT * INTO payment FROM payment_intents WHERE id=NEW.intent_id FOR SHARE;
 IF purchase.id IS NULL OR payment.id IS NULL OR
  ROW(purchase.customer_subject,purchase.business_id,purchase.total_minor,btrim(purchase.currency))
  IS DISTINCT FROM ROW(payment.customer_subject,payment.business_id,payment.amount_minor,btrim(payment.currency))
 THEN RAISE EXCEPTION 'Order and payment snapshot do not match'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER payment_order_links_bind BEFORE INSERT ON payment_order_links FOR EACH ROW EXECUTE FUNCTION m5_bind_order_intent();
CREATE TRIGGER payment_order_links_immutable BEFORE UPDATE OR DELETE ON payment_order_links FOR EACH ROW EXECUTE FUNCTION m5_immutable_record();
CREATE FUNCTION m5_protect_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.customer_subject,NEW.business_id,NEW.branch_id,NEW.total_minor,NEW.currency)
  IS DISTINCT FROM ROW(OLD.customer_subject,OLD.business_id,OLD.branch_id,OLD.total_minor,OLD.currency)
 THEN
  IF EXISTS(SELECT 1 FROM payment_order_links WHERE order_id=OLD.id)
  THEN RAISE EXCEPTION 'An order with a payment intent has an immutable purchase snapshot'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER business_orders_payment_snapshot BEFORE UPDATE ON business_orders FOR EACH ROW EXECUTE FUNCTION m5_protect_order_snapshot();
REVOKE ALL ON payment_order_links FROM PUBLIC;
