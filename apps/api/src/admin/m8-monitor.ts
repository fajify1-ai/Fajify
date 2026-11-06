import {Pool} from 'pg';
import {AdminInsightsService} from './admin-insights.service';
import {AdminCommandService} from './admin-command.service';
import {AdminMonitorService} from './admin-monitor.service';

async function main(){
 if(!process.argv.includes('--once'))throw Error('Only explicit --once monitoring ticks are supported');
 if(!process.env.FAJI_DATABASE_URL)throw Error('M8 monitoring database configuration required');
 const pool=new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:3,connectionTimeoutMillis:3000,statement_timeout:5000});
 try{
  const monitor=new AdminMonitorService(pool,new AdminInsightsService(pool),new AdminCommandService(pool));
  const result=await monitor.tick();
  console.log(JSON.stringify({opened:result.opened,cleared:result.cleared,checkedAt:result.checkedAt}));
 }finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{
 console.error('M8 monitoring tick failed; connection details withheld');process.exitCode=1;
});
