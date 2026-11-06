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

/** Handle approved-driver suspension, manual offline and revoked account while preserving in-trip safety. */
export async function recoverIneligibleAssignments(pool:Pool,limit=100):Promise<{requeued:number;escalated:number}>{
 if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Invalid batch limit');
 const candidates=await pool.query<{id:string}>(`
  SELECT ride.id FROM ride_requests ride
  JOIN ride_drivers driver ON driver.id=ride.assigned_driver_id
  LEFT JOIN account_access account ON account.identity_subject=driver.identity_subject
  LEFT JOIN user_profiles profile ON profile.identity_subject=driver.identity_subject
  WHERE ride.status IN ('assigned','driver_arriving','driver_arrived','in_progress')
   AND (driver.status<>'approved' OR NOT driver.available
       OR COALESCE(account.suspended,true) OR COALESCE(profile.suspended,true)
       OR NOT EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=driver.id AND v.approved AND v.category=ride.category)
       OR ((SELECT COUNT(DISTINCT doc.document_kind) FROM ride_driver_documents doc WHERE doc.driver_id=driver.id AND doc.review_status='approved' AND doc.expires_at>now())<4)
       OR EXISTS(SELECT 1 FROM ride_driver_documents doc WHERE doc.driver_id=driver.id AND (doc.review_status<>'approved' OR doc.expires_at<=now() OR doc.expires_at IS NULL))
       OR NOT EXISTS(SELECT 1 FROM ride_driver_locations l WHERE l.driver_id=driver.id AND l.consent_granted AND l.observed_at>now()-interval '2 minutes'))
  ORDER BY ride.id LIMIT $1`,[limit]);
 let requeued=0,escalated=0;
 for(const candidate of candidates.rows){
  const c=await pool.connect();
  try{
   await c.query('BEGIN');
   const r=await c.query<{id:string;status:string;assigned_driver_id:string|null}>(`SELECT id,status,assigned_driver_id FROM ride_requests WHERE id=$1 FOR UPDATE SKIP LOCKED`,[candidate.id]);
   const ride=r.rows[0];
   if(!ride||!ride.assigned_driver_id){await c.query('ROLLBACK');continue;}
   const driver=await c.query<{ineligible:boolean}>(`
     SELECT (d.status<>'approved' OR NOT d.available OR COALESCE(a.suspended,true) OR COALESCE(p.suspended,true)
       OR NOT EXISTS(SELECT 1 FROM ride_vehicles v WHERE v.driver_id=d.id AND v.approved AND v.category=(SELECT category FROM ride_requests WHERE id=$2))
       OR NOT ((SELECT COUNT(DISTINCT x.document_kind) FROM ride_driver_documents x WHERE x.driver_id=d.id AND x.review_status='approved' AND x.expires_at>now())=4)
       OR EXISTS(SELECT 1 FROM ride_driver_documents x WHERE x.driver_id=d.id AND (x.review_status<>'approved' OR x.expires_at<=now() OR x.expires_at IS NULL))
       OR NOT EXISTS(SELECT 1 FROM ride_driver_locations l WHERE l.driver_id=d.id AND l.consent_granted AND l.observed_at>now()-interval '2 minutes')) AS ineligible
     FROM ride_drivers d LEFT JOIN account_access a ON a.identity_subject=d.identity_subject
     LEFT JOIN user_profiles p ON p.identity_subject=d.identity_subject WHERE d.id=$1`,[ride.assigned_driver_id,ride.id]);
   if(!driver.rows[0]?.ineligible){await c.query('ROLLBACK');continue;}
   if(['assigned','driver_arriving'].includes(ride.status)){
    await c.query("UPDATE ride_requests SET status='requested',assigned_driver_id=NULL,dispatch_generation=dispatch_generation+1,updated_at=now() WHERE id=$1",[ride.id]);
    await c.query("UPDATE ride_dispatch_offers SET status='revoked' WHERE ride_id=$1 AND status IN ('pending','accepted')",[ride.id]);
    await c.query("INSERT INTO ride_trip_events(ride_id,actor_subject,from_state,to_state) VALUES($1,'system:m7-eligibility',$2,'requested')",[ride.id,ride.status]);
    await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.dispatch.requeue',$1)",[JSON.stringify({rideId:ride.id,reason:'driver_ineligible'})]);
    requeued++;
   }else if(['driver_arrived','in_progress'].includes(ride.status)){
    const incident=await c.query<{id:string}>(`INSERT INTO ride_incidents(ride_id,reporter_subject,kind,severity,request_key)
      VALUES($1,'system:m7','driver_ineligible','urgent','system:driver_ineligible')
      ON CONFLICT(ride_id,reporter_subject,request_key) WHERE request_key IS NOT NULL DO NOTHING RETURNING id`,[ride.id]);
    if(incident.rowCount){
     await c.query("INSERT INTO outbox_events(event_type,payload) VALUES('ride.safety.urgent',$1)",[JSON.stringify({rideId:ride.id,incidentId:incident.rows[0].id})]);
     escalated++;
    }
   }
   await c.query('COMMIT');
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }
 return {requeued,escalated};
}

/** Operator-controlled worker: requires isolated service credentials to the application DB. */
export async function runRideExpiryWorker(){
 const url=process.env.FAJI_DATABASE_URL;
 if(!url)throw Error('FAJI_DATABASE_URL required');
 const pool=new Pool({connectionString:url,max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
 try{
  if(process.env.FAJI_RIDE_WORKER_ONCE==='1'){
   console.log(JSON.stringify({offers:await expireRideOffers(pool),assignments:await recoverIneligibleAssignments(pool)}));return;
  }
  let stopping=false;
  process.on('SIGTERM',()=>{stopping=true;});
  process.on('SIGINT',()=>{stopping=true;});
  while(!stopping){
   try{const offers=await expireRideOffers(pool),assignments=await recoverIneligibleAssignments(pool);if(offers.expired||assignments.requeued||assignments.escalated)console.log(JSON.stringify({offers,assignments}));}
   catch(error){console.error('Ride expiry cycle failed',error instanceof Error?error.message:'unknown');}
   await new Promise<void>(resolve=>setTimeout(resolve,5000));
  }
 }finally{await pool.end();}
}
if(require.main===module)runRideExpiryWorker().catch(e=>{console.error('Ride worker failed',e instanceof Error?e.message:'unknown');process.exitCode=1;});
