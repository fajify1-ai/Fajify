import {Pool} from 'pg';
import {assertDisposable} from './disposable-target';
import {grantM5Runtime} from './grant-m5-runtime';

/** Grant only the M7 operations needed by the API; no destructive schema privileges. */
export async function grantM7Runtime(pool:Pool,runtimeUrl:string){
 await assertDisposable(pool);
 const role=new URL(runtimeUrl).username;
 if(!/^[a-z_][a-z0-9_]*$/.test(role))throw new Error('Invalid runtime role');
 await grantM5Runtime(pool,runtimeUrl);
 const named='"'+role+'"';
 const mutable=[
  'ride_drivers','ride_vehicles','ride_driver_documents','ride_requests',
  'ride_dispatch_offers','ride_incidents','ride_dispatch_areas','ride_driver_bank_refs',
  'ride_fares','ride_driver_payouts','ride_payout_fee_evidence','ride_tariff_policies'
 ];
 await pool.query('GRANT SELECT,INSERT,UPDATE ON '+mutable.join(',')+' TO '+named);
 await pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ride_driver_locations TO '+named);
 const appendOnly=['ride_fare_quotes','ride_trip_events','ride_financial_events','ride_payment_links'];
 await pool.query('GRANT SELECT,INSERT ON '+appendOnly.join(',')+' TO '+named);
 await pool.query('GRANT SELECT,INSERT,UPDATE ON customer_booking_ride_links TO '+named);
 await pool.query('GRANT EXECUTE ON FUNCTION m8_booking_ride_guard() TO '+named);
}
async function main(){
 if(!process.env.FAJI_DATABASE_URL||!process.env.FAJI_RUNTIME_DATABASE_URL)
  throw Error('Explicit disposable migration and runtime database URLs required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL});
 try{await grantM7Runtime(pool,process.env.FAJI_RUNTIME_DATABASE_URL);}
 finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error('M7 least-privilege grants failed (connection details withheld)');process.exitCode=1;});
