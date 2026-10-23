import {createPublicKey, verify as verifySignature, type JsonWebKey} from 'node:crypto';
import {UnauthorizedException} from '@nestjs/common';
import type {IdentityVerifier, VerifiedIdentity} from './identity.types';

type JwtHeader={alg?:unknown;kid?:unknown;typ?:unknown};
type Claims={iss?:unknown;aud?:unknown;sub?:unknown;exp?:unknown;nbf?:unknown;iat?:unknown;realm_access?:{roles?:unknown};resource_access?:Record<string,{roles?:unknown}>};
type Key={kid?:string;kty?:string;use?:string;alg?:string;n?:string;e?:string};
export type JwksFetch=(url:string)=>Promise<{keys:Key[]}>;
const b64=(value:string)=>JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as unknown;
const fail=():never=>{throw new UnauthorizedException('Invalid access token');};
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const safeRoles=(value:unknown):string[]=>Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'&&v.length>0):[];
const defaultFetch:JwksFetch=async url=>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),3000);
 try {
  const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json'},redirect:'error'});
  if(!response.ok)throw Error('JWKS request failed');
  const document:unknown=await response.json();
  if(!isRecord(document)||!Array.isArray(document.keys)||document.keys.length>32)throw Error('Invalid JWKS');
  return {keys:document.keys as Key[]};
 }finally{clearTimeout(timeout);}
};

/** Only RS256 access tokens from the exact configured Keycloak realm are accepted. */
export class KeycloakAccessTokenVerifier implements IdentityVerifier {
 private cache:{expires:number;keys:Key[]}|undefined;
 constructor(private readonly issuer:string,private readonly audience:string,private readonly load:JwksFetch=defaultFetch,
  private readonly now:()=>number=()=>Math.floor(Date.now()/1000)){
  const url=new URL(issuer);
  if(url.search||url.hash||url.username||url.password||!(url.protocol==='https:'||(url.protocol==='http:'&&url.hostname==='localhost')))
   throw Error('Invalid Keycloak issuer');
  if(!audience.trim())throw Error('Keycloak audience is required');
 }
 private async keys(force=false):Promise<Key[]> {
  if(!force&&this.cache&&this.cache.expires>this.now())return this.cache.keys;
  const endpoint=this.issuer.replace(/\/$/,'')+'/protocol/openid-connect/certs';
  const result=await this.load(endpoint);
  if(!Array.isArray(result.keys)||result.keys.length>32)throw Error('Invalid JWKS');
  this.cache={keys:result.keys,expires:this.now()+60};
  return result.keys;
 }
 async verifyAccessToken(token:string):Promise<VerifiedIdentity>{
  try{
   if(token.length>16384) return fail();
   const parts=token.split('.');
   if(parts.length!==3||parts.some(s=>!s||!/^[A-Za-z0-9_-]+$/.test(s)))return fail();
   const header=b64(parts[0]),body=b64(parts[1]);
   if(!isRecord(header)||!isRecord(body))return fail();
   const h=header as JwtHeader,c=body as Claims;
   if(h.alg!=='RS256'||typeof h.kid!=='string'||!h.kid||h.kid.length>256)return fail();
   if(h.typ!==undefined&&h.typ!=='JWT')return fail();
   if(c.iss!==this.issuer||typeof c.sub!=='string'||!c.sub||c.sub.length>255)return fail();
   const audiences=typeof c.aud==='string'?[c.aud]:Array.isArray(c.aud)?c.aud:[];
   if(!audiences.every(s=>typeof s==='string')||!audiences.includes(this.audience))return fail();
   const now=this.now();
   if(typeof c.exp!=='number'||!Number.isInteger(c.exp)||c.exp<=now||c.exp>now+86400)return fail();
   if(c.nbf!==undefined&&(typeof c.nbf!=='number'||c.nbf>now))return fail();
   if(typeof c.iat!=='number'||!Number.isInteger(c.iat)||c.iat>now+60||c.iat>c.exp)return fail();
   let keys=await this.keys();
   let selected=keys.find(k=>k.kid===h.kid);
   if(!selected){keys=await this.keys(true);selected=keys.find(k=>k.kid===h.kid);}
   if(!selected||selected.kty!=='RSA'||selected.use&&selected.use!=='sig'||selected.alg&&selected.alg!=='RS256'||!selected.n||!selected.e)return fail();
   const publicKey=createPublicKey({key:selected as JsonWebKey,format:'jwk'});
   const valid=verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),publicKey,Buffer.from(parts[2],'base64url'));
   if(!valid)return fail();
   const realm=isRecord(c.realm_access)?safeRoles(c.realm_access.roles):[];
   const resources=isRecord(c.resource_access)?c.resource_access:{};
   const client=isRecord(resources[this.audience])?safeRoles(resources[this.audience].roles):[];
   return {subject:c.sub,issuer:this.issuer,audience:audiences as string[],expiresAt:c.exp,issuedAt:c.iat,roles:[...new Set([...realm,...client])]};
  }catch{return fail();}
 }
}
