// Keep ordinary API tests independent from disposable PostgreSQL acceptance.
// Database integration tests are explicitly exercised by test:database.
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const directory=resolve(import.meta.dirname,'../test');
const tests=readdirSync(directory)
 .filter(name=>name.endsWith('.test.ts')&&!name.endsWith('.database.test.ts'))
 .sort()
 .map(name=>resolve(directory,name));
if(tests.length===0)throw Error('No API unit test files discovered');
const result=spawnSync(process.execPath,['--import','tsx','--test',...tests],{
 stdio:'inherit',env:process.env
});
if(result.error)throw result.error;
process.exitCode=result.status??1;
