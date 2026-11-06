-- Evaluation history records the actual recommendation outcome for audit and quality.
-- New evaluations are appended; existing evidence is immutable.
CREATE FUNCTION m6_evaluation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'M6 recommendation evaluation evidence is append-only';
END;
$$;
CREATE TRIGGER customer_plan_evaluations_immutable
 BEFORE UPDATE OR DELETE ON customer_plan_evaluations
 FOR EACH ROW EXECUTE FUNCTION m6_evaluation_immutable();
