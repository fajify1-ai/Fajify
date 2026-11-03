import {Pool} from 'pg';

/** Run at most one batch per invocation; safe across worker replicas. */
export async function expireRideOffers(pool:Pool,limit=100):Promise<{expired:number;requeued:number}>{
 if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Invalid batch limit');
 const ids=await pool.query<{ride_id:string}>(`SELECT ride_id FROM (
   SELECT DISTINCT ride_id FROM ride_dispatch_offers WHERE status='pending' AND expires_at<=now()
   UNION
   SELECT id AS ride_id FROM ride_requests r WHERE status='offered'
     AND NOT EXISTS (SELECT 1 FROM ride_dispatch_offers o WHERE o.ride_id=r.id AND o.status='pending' AND o.expires_at>now())
  ) x ORDER BY ride_id LIMIT $1`,[limit]);
 let expired=0,requeued=0;
 for(const {ride_id} of ids.rows){
  const c=await pool.connect();
  try {
   await c.query('BEGIN');
   // Lock ride first, consistent with dispatch assignment and offer creation.
   const ride=await c.query<{status:string}>(`SELECT status FROM ride_requests WHERE id=$1 FOR UPDATE SKIP LOCKED`,[ride_id]);
   if(!ride.rows[0]){await c.query('ROLLBACK');continue;}
   const gone=await c.query(`UPDATE ride_dispatch_offers SET status='expired' WHERE ride_id=$1 AND status='pending' AND expires_at<=now() RETURNING id`,[ride_id]);
   expired+=gone.rowCount??0;
   if(ride.rows[0].status==='offered'){
    const pending=await c.query(`SELECT 1 FROM ride_dispatch_offers WHERE ride_id=$1 AND status='pending' AND expires_at>now() LIMIT 1`,[ride_id]);
    if(!pending.rowCount){
     await c.query("UPDATE ride_requests SET status='requested',dispatch_generation=dispatch_generation+1,updated_at=now() WHERE id=$1",[ride_id]);
     await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.dispatch.requeue',$1)",[JSON.stringify({rideId:ride_id})]);
     requeued++;
    }
   }
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 return {expired,requeued};
}

/** Operator-controlled worker: requires isolated service credentials to the application DB. */
export async function runRideExpiryWorker(){
 const url=process.env.FAJI_DATABASE_URL;
 if(!url)throw Error('FAJI_DATABASE_URL required');
 const pool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
 try{
  if(process.env.FAJI_RIDE_WORKER_ONCE==='1'){
   console.log(JSON.stringify(await expireRideOffers(pool)));return;
  }
  let stopping=false;
  process.on('SIGTERM',()=>{stopping=true;});
  process.on('SIGINT',()=>{stopping=true;});
  while(!stopping){
   try{const result=await expireRideOffers(pool);if(result.expired)console.log(JSON.stringify(result));}
   catch(error){console.error('Ride expiry cycle failed',error instanceof Error?error.message:'unknown');}
   await new Promise<void>(resolve=>setTimeout(resolve,5000));
  }
 }finally{await pool.end();}
}
if(require.main===module)runRideExpiryWorker().catch(e=>{console.error('Ride worker failed',e instanceof Error?e.message:'unknown');process.exitCode=1;});
