import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [directory,commit,status]=process.argv.slice(2);
if(!directory||!commit||status===undefined)throw Error('Report directory, source SHA, and exit status required');
const required=['disposable-preflight','database-types','api-types','m6-test-types','api-lint','api-build','migrations','migrations-replay','runtime-grants','database-tests','api-tests','m6-postgres-tests','contracts','contract-snapshot','source-whitespace','dependency-audit','source-unchanged'];
const testNames=['database-tests','api-tests','m6-postgres-tests'];
const problems=[];
let checks=[];
try{checks=readFileSync(join(directory,'checks.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(v=>JSON.parse(v));}
catch{problems.push('Missing or malformed checks.jsonl');}
for(const name of required){
 const rows=checks.filter(x=>x&&x.name===name);
 if(rows.length!==1){problems.push('Expected exactly one '+name+' record');continue;}
 if(rows[0].exitCode!==0)problems.push(name+' failed');
 if(rows[0].test!==testNames.includes(name))problems.push(name+' test classification mismatch');
}
for(const row of checks)if(!row||!required.includes(row.name))problems.push('Unexpected check');
const tests=testNames.map(name=>{
 let log='';try{log=readFileSync(join(directory,name+'.log'),'utf8');}catch{problems.push('Missing test log '+name);}
 const count=(key)=>{const matches=[...log.matchAll(new RegExp('^# '+key+' (\\d+)\\s*$','gm'))];return matches.length===1?Number(matches[0][1]):null;};
 const result={name,total:count('tests'),pass:count('pass'),fail:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),todo:count('todo')};
 if(result.total===null||result.total<1||result.pass!==result.total||result.fail!==0||result.cancelled!==0||result.skipped!==0||result.todo!==0)problems.push(name+' TAP did not show clean complete pass');
 return result;
});
if(status!=='0')problems.push('Check process exit status '+status);
if(!/^[0-9a-f]{40}$/.test(commit))problems.push('Invalid source SHA');
const result={milestone:'M6-P1',commit,result:problems.length?'FAIL':'PASS',node:process.version,checks,tests,problems,recordedAt:new Date().toISOString()};
writeFileSync(join(directory,'acceptance.json'),JSON.stringify(result,null,2)+'\n');
console.log('M6-P1 '+result.result+' — '+join(directory,'acceptance.json'));
if(result.result!=='PASS')process.exitCode=1;
