-- Reuse the established support operations queue; no separate operator workflow.
ALTER TABLE web_merchant_support ADD COLUMN customer_case_id uuid UNIQUE REFERENCES customer_support_cases(id);
CREATE INDEX web_support_customer_case ON web_merchant_support(customer_case_id) WHERE customer_case_id IS NOT NULL;
