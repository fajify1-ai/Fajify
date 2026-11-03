import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {M3_REQUIRED_CHECKS,M3_TEST_CHECKS} from './m3-verification-checks.mjs';
const reporter=fileURLToPath(new URL('./m3-verification-report.mjs',import.meta.url));
const source='a'.repeat(40);
function fixture(edit=()=>{},status='0'){
 const directory=mkdtempSync(join(tmpdir(),'fajify-m3-report-fixture-'));
 try{
  const checks=M3_REQUIRED_CHECKS.map(name=>({name,test:M3_TEST_CHECKS.includes(name),exitCode:0}));
  for(const name of M3_TEST_CHECKS)writeFileSync(join(directory,name+'.log'),'TAP version 13\n# tests 2\n# pass 2\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n');
  edit({directory,checks});
  writeFileSync(join(directory,'checks.jsonl'),checks.map(c=>JSON.stringify(c)).join('\n')+'\n');
  const result=spawnSync(process.execPath,[reporter,directory,source,status],{encoding:'utf8'});
  assert.equal(result.error,undefined);
  return {exitCode:result.status,report:JSON.parse(readFileSync(join(directory,'acceptance.json'),'utf8'))};
 }finally{rmSync(directory,{recursive:true,force:true});}
}
test('complete gate records and passing TAP summaries produce PASS',()=>{
 const result=fixture();assert.equal(result.exitCode,0);assert.equal(result.report.result,'PASS');assert.equal(result.report.commit,source);
});
test('missing, duplicate and nonzero check records cannot produce PASS',()=>{
 for(const edit of [({checks})=>checks.pop(),({checks})=>checks.push(checks[0]),({checks})=>{checks[0].exitCode=1;},({checks})=>{checks.length=0;}]){
  const result=fixture(edit);assert.equal(result.exitCode,1);assert.equal(result.report.result,'FAIL');
 }
});
test('missing, incomplete or skipped test summaries fail even when check exit codes are zero',()=>{
 for(const content of ['', '# tests 0\n# pass 0\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n', '# tests 2\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n']){
  const result=fixture(({directory})=>writeFileSync(join(directory,'api-tests.log'),content));
  assert.equal(result.exitCode,1);assert.equal(result.report.result,'FAIL');
 }
});
test('failed overall process status overrides complete passing check records',()=>{
 const result=fixture(()=>{},'2');assert.equal(result.exitCode,1);assert.equal(result.report.result,'FAIL');
});
