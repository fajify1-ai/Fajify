import {Inject,Injectable} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {AdminInsightsService} from './admin-insights.service';

/** An operator may schedule this tick using a supervised process or invoke
 * the authenticated endpoint. Never assumes that an outbox entry was delivered.
 * Durable signal state prevents duplicate incident storms across instances.
 */
@Injectable()
export class AdminMonitorService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,
  @Inject(AdminInsightsService)private readonly insights:AdminInsightsService){}
 async tick(){
  const status=await this.insights.monitoring();
  const checks=[
   {key:'finance_dead_jobs',open:status.deadFinanceJobs>0,severity:'critical',summary:'Finance jobs reached the dead-letter state'},
   {key:'finance_expired_leases',open:status.expiredFinanceLeases>0,severity:'high',summary:'Finance jobs have expired execution leases'},
   {key:'finance_overdue_jobs',open:status.overdueFinanceJobs>0,severity:'high',summary:'Finance jobs are overdue for execution'},
  ] as const;
  const c=await this.pool.connect();
  const opened:string[]=[],cleared:string[]=[];
  try{
   await c.query('BEGIN');
   await c.query("SET LOCAL lock_timeout='5s'");
   await c.query("SELECT pg_advisory_xact_lock(hashtextextended('m8:monitor:tick',0))");
   for(const check of checks){
    const prior=await c.query<{active:boolean;incident_id:string|null}>(
     'SELECT active,incident_id FROM admin_monitor_signals WHERE signal_key=$1 FOR UPDATE',[check.key]);
    if(check.open){
     if(prior.rows[0]?.active){
      await c.query('UPDATE admin_monitor_signals SET last_checked_at=now() WHERE signal_key=$1',[check.key]);
      continue;
     }
     const incident=(await c.query(
      "INSERT INTO admin_incidents(incident_type,summary,severity,created_by) VALUES('platform',$1,$2,'system:m8-monitor') RETURNING id",
      [check.summary,check.severity])).rows[0];
     await c.query(`INSERT INTO admin_monitor_signals(signal_key,incident_id,active,last_checked_at)
      VALUES($1,$2,true,now())
      ON CONFLICT(signal_key) DO UPDATE SET incident_id=EXCLUDED.incident_id,active=true,last_checked_at=now()`,
      [check.key,incident.id]);
     await c.query("INSERT INTO admin_action_events(actor_subject,operation,resource_type,resource_id,outcome,reason) VALUES('system:m8-monitor','monitor.signal_opened','incident',$1,'applied',$2)",
      [incident.id,check.key]);
     await c.query('INSERT INTO outbox_events(event_type,payload) VALUES($1,$2)',
      ['admin.incident.'+check.severity,JSON.stringify({incidentId:incident.id,signal:check.key})]);
     opened.push(check.key);
    }else if(prior.rows[0]?.active){
     await c.query('UPDATE admin_monitor_signals SET active=false,last_checked_at=now() WHERE signal_key=$1',[check.key]);
     await c.query("INSERT INTO admin_action_events(actor_subject,operation,resource_type,resource_id,outcome,reason) VALUES('system:m8-monitor','monitor.signal_cleared','incident',$1,'applied',$2)",
      [prior.rows[0].incident_id,check.key]);
     cleared.push(check.key);
    }
   }
   await c.query('COMMIT');
   return {checkedAt:status.checkedAt,opened,cleared};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
