-- Run as owner, replacing faji_runtime with the deployment runtime role.
GRANT SELECT,INSERT,UPDATE,DELETE ON auth_user,auth_session,auth_account,auth_verification,auth_rate_limit,auth_two_factor TO faji_runtime;
GRANT SELECT ON application_roles TO faji_runtime;
-- The owner-controlled provisioning trigger installed by migration 0104 grants customer only.
GRANT SELECT,INSERT,UPDATE ON auth_sms_budgets TO faji_runtime;
