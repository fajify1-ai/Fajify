import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const apps=['customer_web','admin_web','business_web','ride_dispatch_web'];
for(const app of process.argv.length>2?process.argv.slice(2):apps){
 if(!apps.includes(app))throw Error('Unknown web application');
 const root=resolve('apps',app),target=resolve(root,'.next/standalone/apps',app);
 if(!existsSync(resolve(target,'server.js')))throw Error('Build the standalone app first');
 mkdirSync(resolve(target,'.next'),{recursive:true});
 cpSync(resolve(root,'.next/static'),resolve(target,'.next/static'),{recursive:true});
 if(existsSync(resolve(root,'public')))cpSync(resolve(root,'public'),resolve(target,'public'),{recursive:true});
}
console.log('Standalone web assets prepared (no services started)');
