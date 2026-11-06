import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('M8 acceptance report rejects missing evidence rather than claiming PASS',()=>{
 const dir=mkdtempSync(join(tmpdir(),'fajify-m8-report-negative-'));
 try{
  const script=resolve('tooling/m8-verification-report.mjs');
  const run=spawnSync(process.execPath,[script,dir,'a'.repeat(40),'1'],{encoding:'utf8'});
  assert.notEqual(run.status,0);
  const result=JSON.parse(readFileSync(join(dir,'acceptance.json'),'utf8'));
  assert.equal(result.result,'FAIL');assert.ok(result.problems.length);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
