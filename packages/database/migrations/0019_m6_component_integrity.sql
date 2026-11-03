-- M6-P1: preserve package component reservation identity and tenant boundaries.
CREATE FUNCTION m6_component_hold_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_quantity bigint;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Package component allocations are historical and cannot be deleted'; END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.hold_id,NEW.availability_id,NEW.quantity) IS DISTINCT FROM ROW(OLD.hold_id,OLD.availability_id,OLD.quantity)
   OR OLD.released_at IS NOT NULL OR NEW.released_at IS NULL
  THEN RAISE EXCEPTION 'Illegal package component allocation transition'; END IF;
  RETURN NEW;
 END IF;
 SELECT pc.quantity::bigint * CASE WHEN p.pricing_model='per_guest' THEN h.quantity::bigint ELSE 1::bigint END
 INTO expected_quantity
 FROM paid_holds h
 JOIN business_catalogue package ON package.id=h.catalogue_id AND package.kind='package'
 JOIN business_public_packages p ON p.catalogue_id=package.id
 JOIN business_availability base ON base.id=h.availability_id
 JOIN business_availability component ON component.id=NEW.availability_id
 JOIN business_package_components pc ON pc.package_id=h.catalogue_id AND pc.component_id=component.catalogue_id
 WHERE h.id=NEW.hold_id AND h.kind='reservation' AND h.status='held'
 AND component.business_id=h.business_id AND component.branch_id=h.branch_id
 AND pc.business_id=h.business_id AND pc.branch_id=h.branch_id
 AND component.starts_at=base.starts_at AND component.active;
 IF expected_quantity IS NULL OR expected_quantity<>NEW.quantity
 THEN RAISE EXCEPTION 'Package component allocation violates merchant, capacity or quantity boundaries'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER package_component_hold_guard
 BEFORE INSERT OR UPDATE OR DELETE ON package_component_holds
 FOR EACH ROW EXECUTE FUNCTION m6_component_hold_guard();
