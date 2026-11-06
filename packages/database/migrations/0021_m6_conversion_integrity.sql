CREATE FUNCTION m6_plan_hold_link_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE plan_owner varchar(255); payment_owner varchar(255); current_revision integer;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Plan/payment conversion history is immutable'; END IF;
 SELECT customer_subject,revision INTO plan_owner,current_revision FROM customer_plans WHERE id=NEW.plan_id;
 SELECT customer_subject INTO payment_owner FROM paid_holds WHERE id=NEW.hold_id;
 IF plan_owner IS DISTINCT FROM NEW.customer_subject
    OR payment_owner IS DISTINCT FROM NEW.customer_subject
    OR current_revision IS DISTINCT FROM NEW.plan_revision
 THEN RAISE EXCEPTION 'Plan conversion ownership or revision mismatch'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER customer_plan_hold_link_guard
 BEFORE INSERT OR UPDATE OR DELETE ON customer_plan_hold_links
 FOR EACH ROW EXECUTE FUNCTION m6_plan_hold_link_guard();
