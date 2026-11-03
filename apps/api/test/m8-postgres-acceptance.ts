import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {assertDisposable} from '../../../packages/database/scripts/disposable-target';
import {AdminCommandService} from '../src/admin/admin-command.service';
import {AdminGovernanceService} from '../src/admin/admin-governance.service';
import {AdminSupportService} from '../src/admin/admin-support.service';
import {AdminIncidentService} from '../src/admin/admin-incidents.service';
import {AdminInsightsService} from '../src/admin/admin-insights.service';
import {AdminMonitorService} from '../src/admin/admin-monitor.service';

test('M8 restricted PostgreSQL: scope grants, immutable commands, moderation barriers, support and incidents',async()=>{
 if(!process.env.FAJI_DATABASE_URL||!process.env.FAJI_RUNTIME_DATABASE_URL)throw Error('Explicit disposable M8 database URLs required');
 const migrator=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:2});
 const runtime=new Pool({connectionString:process.env.FAJI_RUNTIME_DATABASE_URL,max:3});
 try{
  await assertDisposable(migrator);
  const id=randomUUID(),admin='m8-admin-'+id,owner='m8-owner-'+id,customer='m8-customer-'+id;
  for(const sub of [admin,owner,customer]){
   await migrator.query('INSERT INTO user_profiles(identity_subject) VALUES($1)',[sub]);
   await migrator.query('INSERT INTO account_access(identity_subject) VALUES($1)',[sub]);
  }
  for(const scope of ['governance.read','governance.write','support.write','monitoring.read','incidents.write']){
   await migrator.query('INSERT INTO admin_scope_grants(identity_subject,scope,granted_by) VALUES($1,$2,$3)',[admin,scope,'operator:test']);
  }
  assert.equal((await runtime.query('SELECT 1 FROM admin_scope_grants WHERE identity_subject=$1',[admin])).rowCount,5);
  assert.equal((await runtime.query('SELECT count(*)::int AS total FROM admin_scope_grant_events WHERE identity_subject=$1',[admin])).rows[0].total,5);
  await assert.rejects(runtime.query("UPDATE admin_scope_grants SET active=false WHERE identity_subject=$1",[admin]));
  const business=(await migrator.query(
   "INSERT INTO business_onboarding(applicant_subject,display_name,status,reviewer_subject,reviewed_at) VALUES($1,'M8 Test Venue','approved','test-approver',now()) RETURNING id",
   [owner])).rows[0].id;
  const branch=(await migrator.query(
   "INSERT INTO business_branches(business_id,name) VALUES($1,'M8 Test Branch') RETURNING id",[business])).rows[0].id;
  const item=(await migrator.query(
   "INSERT INTO business_catalogue(business_id,branch_id,name,kind,price_minor,published) VALUES($1,$2,'M8 Test Service','service',1000,true) RETURNING id",
   [business,branch])).rows[0].id;
  const order=(await migrator.query(
   "INSERT INTO business_orders(business_id,branch_id,customer_subject,status,total_minor,currency) VALUES($1,$2,$3,'fulfilled',1000,'NGN') RETURNING id",
   [business,branch,customer])).rows[0].id;
  const review=(await migrator.query(
   "INSERT INTO customer_reviews(customer_subject,business_id,branch_id,order_id,rating,body) VALUES($1,$2,$3,$4,4,'Good venue, minor delay') RETURNING id",
   [customer,business,branch,order])).rows[0].id;
  const supportId=(await migrator.query(
   "INSERT INTO customer_support_cases(customer_subject,request_key,fingerprint,category,subject) VALUES($1,'support-m8-open-001',$2,'other','M8 customer support request') RETURNING id",
   [customer,'a'.repeat(64)])).rows[0].id;
  const cmd=new AdminCommandService(runtime),gov=new AdminGovernanceService(runtime,cmd);
  const result=await gov.moderation(admin,review,{requestKey:'moderate-001',visibility:'hidden',reason:'Confirmed public content policy violation'});
  assert.equal(result.changed,true);
  assert.deepEqual(await gov.moderation(admin,review,{requestKey:'moderate-001',visibility:'hidden',reason:'Confirmed public content policy violation'}),result);
  await assert.rejects(gov.moderation(admin,review,{requestKey:'moderate-001',visibility:'visible',reason:'Different intended action'}));
  assert.equal((await runtime.query('SELECT moderation_status FROM customer_reviews WHERE id=$1',[review])).rows[0].moderation_status,'hidden');
  const blocked=await gov.restriction(admin,'branch',branch,{requestKey:'branch-lock-001',restricted:true,reason:'Temporary platform safety restriction'});
  assert.equal(blocked.restricted,true);
  await assert.rejects(runtime.query('UPDATE business_branches SET active=true WHERE id=$1',[branch]));
  await gov.restriction(admin,'branch',branch,{requestKey:'branch-open-002',restricted:false,reason:'Safety restriction cleared after review'});
  assert.equal((await runtime.query('SELECT active FROM business_branches WHERE id=$1',[branch])).rows[0].active,true);
  await gov.restriction(admin,'catalogue',item,{requestKey:'item-lock-001',restricted:true,reason:'Catalogue offering temporarily prohibited'});
  await assert.rejects(runtime.query('UPDATE business_catalogue SET published=true WHERE id=$1',[item]));
  const support=new AdminSupportService(runtime,cmd);
  const assigned=await support.assign(admin,supportId,{requestKey:'assign-m8-001',assignee:admin,priority:'urgent',reason:'Escalate customer experience promptly'});
  assert.equal(assigned.changed,true);
  const reply=await support.reply(admin,supportId,{requestKey:'reply-m8-001',message:'We are investigating your concern.'});
  assert.equal(reply.body,'We are investigating your concern.');
  assert.deepEqual(await support.reply(admin,supportId,{requestKey:'reply-m8-001',message:'We are investigating your concern.'}),reply);
  assert.equal((await runtime.query('SELECT author_kind FROM customer_support_messages WHERE id=$1',[reply.id])).rows[0].author_kind,'admin');
  await support.status(admin,supportId,{requestKey:'close-m8-001',status:'closed',reason:'The support case was resolved'});
  await assert.rejects(support.reply(admin,supportId,{requestKey:'reply-m8-002',message:'Cannot reply after closure.'}));
  const incidents=new AdminIncidentService(runtime,cmd);
  const opened=await incidents.create(admin,{requestKey:'incident-m8-001',incidentType:'platform',summary:'Synthetic operational incident',severity:'high'});
  await assert.rejects(incidents.transition(admin,opened.id,{requestKey:'incident-m8-002',state:'mitigated',reason:'Cannot skip required investigating state'}));
  const moved=await incidents.transition(admin,opened.id,{requestKey:'incident-m8-003',state:'investigating',reason:'Engineering has started investigation'});
  assert.equal(moved.changed,true);
  const insights=new AdminInsightsService(runtime);
  const activity=await insights.activity(admin,customer,{limit:10,offset:0});
  assert.ok(activity.items.some(x=>x.kind==='order'));
  assert.ok(activity.items.some(x=>x.kind==='support'));
  const finance=await insights.finance();assert.match(finance.capturedMinor,/^[0-9]+$/);
  const reports=await insights.report(30);assert.equal(reports.currency,'NGN');
  const merchantReport=await insights.businessReport(business);assert.equal(merchantReport.activeBranches,1);
  const consistency=await insights.consistency();assert.equal(consistency.confirmedUnverifiedHolds,0);
  const monitor=new AdminMonitorService(runtime,insights,cmd);
  await migrator.query("INSERT INTO finance_jobs(kind,resource_id,state,attempts) VALUES('m8synthetic',$1,'dead',8)",[id]);
  const first=await monitor.tick();assert.ok(first.opened.includes('finance_dead_jobs'));
  const second=await monitor.tick();assert.equal(second.opened.length,0);
  const linked=(await runtime.query("SELECT incident_id FROM admin_monitor_signals WHERE signal_key='finance_dead_jobs'")).rows[0];
  await assert.rejects(incidents.transition(admin,linked.incident_id,{requestKey:'monitor-m8-close-001',state:'resolved',reason:'Cannot resolve while job is still dead'}));
  const alerts=await monitor.alerts({limit:20,offset:0});assert.ok(alerts.items.length>=1);
  const ack=await monitor.acknowledge(admin,alerts.items[0].id,'alert-m8-001');assert.equal(ack.changed,true);
  const events=await migrator.query("SELECT id FROM admin_action_events WHERE actor_subject=$1 LIMIT 1",[admin]);
  assert.ok(events.rowCount);
  await assert.rejects(migrator.query("UPDATE admin_action_events SET operation='tampered' WHERE id=$1",[events.rows[0].id]));
  await assert.rejects(runtime.query('DELETE FROM admin_command_receipts WHERE actor_subject=$1',[admin]));
 }finally{await runtime.end();await migrator.end();}
});
