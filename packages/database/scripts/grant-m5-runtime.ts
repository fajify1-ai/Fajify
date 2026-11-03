import {Pool} from 'pg';
import {assertDisposable} from './disposable-target';
export async function grantM5Runtime(pool:Pool,runtimeUrl:string){
 await assertDisposable(pool);const role=new URL(runtimeUrl).username;if(!/^[a-z_][a-z0-9_]*$/.test(role))throw Error('Invalid runtime role');
 const quoted='"'+role+'"';
 await pool.query('GRANT USAGE ON SCHEMA public TO '+quoted);
 const mutable=['user_profiles','audit_events','account_access','resource_memberships','identity_security_events','revoked_identity_sessions','business_onboarding','outbox_events','business_branches','business_catalogue','business_availability','business_reservations','business_orders','business_order_items','business_branch_hours','business_event_config','business_package_components','customer_request_keys','business_public_profiles','business_public_media','business_public_packages','business_package_addons','customer_wishlist','customer_reviews','customer_notifications','customer_support_cases','customer_support_messages','customer_request_buckets','customer_plans','customer_plan_feedback','package_component_holds','customer_plan_evaluations'];
 await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON '+mutable.join(',')+' TO '+quoted);
 const state=['payment_intents','payment_terms','checkout_sessions','ticket_inventory','paid_holds','issued_tickets','finance_refunds','merchant_recipients','settlement_batches','finance_disputes','finance_jobs','finance_reconciliation_cases','payment_order_current'];
 await pool.query('GRANT SELECT,INSERT,UPDATE ON '+state.join(',')+' TO '+quoted);
 const immutable=['payment_receipts','ledger_entries','ledger_accounts','payment_order_links','payment_order_attempts','finance_policies','finance_postings','finance_account_owners','payment_fees','finance_environment','settlement_items','settlement_fees','settlement_fee_returns','finance_consumed_events','finance_operation_events'];
 await pool.query('GRANT SELECT,INSERT ON '+immutable.join(',')+' TO '+quoted);
 await pool.query('GRANT SELECT,INSERT,DELETE ON settlement_claims TO '+quoted);
 await pool.query('GRANT SELECT ON finance_all_postings,finance_order_links TO '+quoted);
 await pool.query('GRANT EXECUTE ON FUNCTION faji_customer_notification() TO '+quoted);
}
async function main(){
 if(!process.env.FAJI_DATABASE_URL||!process.env.FAJI_RUNTIME_DATABASE_URL)throw Error('Explicit disposable migration/runtime URLs required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL});try{await grantM5Runtime(pool,process.env.FAJI_RUNTIME_DATABASE_URL);}finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error('M5 disposable grants failed; connection details withheld');process.exitCode=1;});
