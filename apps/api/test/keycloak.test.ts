import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createPublicKey} from 'node:crypto';
import {KeycloakAccessTokenVerifier} from '../src/auth/keycloak.verifier';
const issuer='https://identity.example.test/realms/faji',audience='faji-api';
const pair=generateKeyPairSync('rsa',{modulusLength:2048});
const pub=createPublicKey(pair.privateKey).export({format:'jwk'});
const now=1_800_000_000;
const load=async(url:string)=>{assert.equal(url,issuer+'/protocol/openid-connect/certs');return {keys:[{...pub,kid:'k1',alg:'RS256',use:'sig'}]};};
const verifier=()=>new KeycloakAccessTokenVerifier(issuer,audience,load,()=>now);
function token(claims:Record<string,unknown>={},header:Record<string,unknown>={}){
 const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'k1',typ:'JWT',...header})).toString('base64url');
 const p=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:'subject-1',iat:now-10,exp:now+300,realm_access:{roles:['customer']},resource_access:{'faji-api':{roles:['merchant']}},...claims})).toString('base64url');
 return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),pair.privateKey).toString('base64url');
}
test('signed token validates subject and roles',async()=>{
 const id=await verifier().verifyAccessToken(token());assert.equal(id.subject,'subject-1');assert.deepEqual(id.roles,['customer','merchant']);
});
test('rejects tampered signature and wrong issuer/audience',async()=>{
 const v=verifier();
 await assert.rejects(v.verifyAccessToken(token({iss:'https://attacker.test'})),{status:401});
 await assert.rejects(v.verifyAccessToken(token({aud:'other'})),{status:401});
 const t=token();const pieces=t.split('.');pieces[1]=Buffer.from(JSON.stringify({sub:'attacker'})).toString('base64url');
 await assert.rejects(v.verifyAccessToken(pieces.join('.')),{status:401});
});
test('rejects expiration, future not-before, unsupported algorithm and invalid kid',async()=>{
 const v=verifier();
 for(const t of [token({exp:now-1}),token({nbf:now+3}),token({}, {alg:'none'}),token({}, {kid:'unknown'})])
  await assert.rejects(v.verifyAccessToken(t),{status:401});
});
test('rejects malformed and non-JWT input',async()=>{
 for(const t of ['', 'a.b', 'Bearer abc', 'e30.e30.e30'])await assert.rejects(verifier().verifyAccessToken(t),{status:401});
});
