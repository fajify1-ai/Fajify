import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const [directory,commit,status]=process.argv.slice(2);
if(!directory||!commit||!status)throw Error('Report directory, exact source commit and exit status required');
const records=join(directory,'checks.jsonl');
const checks=existsSync(records)?readFileSync(records,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
const tests=checks.filter(c=>c.test).map(check=>{
 const log=readFileSync(join(directory,check.name+'.log'),'utf8');
 const count=name=>{const match=log.match(new RegExp('^# '+name+' (\\d+)\\s*$','m'));return match?Number(match[1]):null;};
 return {check:check.name,total:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),todo:count('todo')};
});
const incomplete=tests.some(t=>t.total===null||t.fail!==0||t.skipped!==0||t.todo!==0);
const result={milestone:'M4-P1',commit,result:Number(status)===0&&!incomplete?'PASS':'FAIL',node:process.version,checks,tests,recordedAt:new Date().toISOString()};
writeFileSync(join(directory,'acceptance.json'),JSON.stringify(result,null,2)+'\n');
console.log('M4-P1 '+result.result+' — '+join(directory,'acceptance.json'));
if(result.result!=='PASS')process.exitCode=1;
