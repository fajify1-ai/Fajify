import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {M3_REQUIRED_CHECKS,M3_TEST_CHECKS} from './m3-verification-checks.mjs';
const [directory,commit,status]=process.argv.slice(2);
if(!directory||!commit||status===undefined)throw Error('Report directory, exact source commit and exit status required');
const problems=[];
let checks=[];
try{
 checks=readFileSync(join(directory,'checks.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
}catch{problems.push('Missing or invalid check records');}
for(const name of M3_REQUIRED_CHECKS){
 const records=checks.filter(c=>c&&c.name===name);
 if(records.length!==1){problems.push('Expected exactly one result for '+name);continue;}
 if(records[0].exitCode!==0)problems.push('Check did not pass: '+name);
 if(records[0].test!==M3_TEST_CHECKS.includes(name))problems.push('Incorrect test classification: '+name);
}
for(const record of checks)if(!record||!M3_REQUIRED_CHECKS.includes(record.name))problems.push('Unknown check record');
const tests=M3_TEST_CHECKS.map(name=>{
 let log='';
 try{log=readFileSync(join(directory,name+'.log'),'utf8');}catch{problems.push('Missing test log: '+name);}
 const count=field=>{const matches=[...log.matchAll(new RegExp('^# '+field+' (\\d+)\\s*$','gm'))];return matches.length===1?Number(matches[0][1]):null;};
 const summary={check:name,total:count('tests'),pass:count('pass'),fail:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),todo:count('todo')};
 if(summary.total===null||summary.total<1||summary.pass!==summary.total||summary.fail!==0||summary.cancelled!==0||summary.skipped!==0||summary.todo!==0)
  problems.push('Incomplete or failing TAP summary: '+name);
 return summary;
});
if(status!=='0')problems.push('Verification process exited with status '+status);
if(!/^[a-f0-9]{40}$/.test(commit))problems.push('Invalid source commit');
const result={milestone:'M3-P1',commit,result:problems.length?'FAIL':'PASS',node:process.version,checks,tests,problems,recordedAt:new Date().toISOString()};
writeFileSync(join(directory,'acceptance.json'),JSON.stringify(result,null,2)+'\n');
console.log('M3-P1 '+result.result+' — '+join(directory,'acceptance.json'));
if(result.result!=='PASS')process.exitCode=1;
