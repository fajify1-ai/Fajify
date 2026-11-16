-- Legacy identity/finance routes must not bypass the operator-managed M8 scope model.
ALTER TABLE admin_scope_grants DROP CONSTRAINT admin_scope_grants_scope_check;
ALTER TABLE admin_scope_grants ADD CONSTRAINT admin_scope_grants_scope_check CHECK(scope IN (
 'operations.read','audit.read','governance.read','governance.write','identity.write',
 'finance.read','finance.write','support.read','support.write','integrations.read',
 'reports.read','monitoring.read','incidents.write'
));
