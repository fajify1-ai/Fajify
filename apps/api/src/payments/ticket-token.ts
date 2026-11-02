import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
function keys():Record<string,string>{try{const value=JSON.parse(process.env.TICKET_SIGNING_KEYS??'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new ServiceUnavailableException('Ticket signing keys unavailable');}}
export function ticketKey(id?:string){const keyId=id??process.env.TICKET_ACTIVE_KEY_ID;const secret=keyId?keys()[keyId]:undefined;if(!keyId||! /^[A-Za-z0-9_-]{1,80}$/.test(keyId)||typeof secret!=='string'||! /^[a-fA-F0-9]{64}$/.test(secret))throw new ServiceUnavailableException('Ticket signing key unavailable');return {keyId,secret:Buffer.from(secret,'hex')};}
export function ticketNonce(){return randomBytes(24).toString('hex');}
export function ticketToken(id:string,nonce:string,keyId:string){const {secret}=ticketKey(keyId);return id+'.'+nonce+'.'+keyId+'.'+createHmac('sha256',secret).update(id+'.'+nonce+'.'+keyId).digest('hex');}
export function parseTicketToken(token:string){
 if(typeof token!=='string'||token.length>300)throw new UnauthorizedException('Invalid ticket');
 const [id,nonce,keyId,mac,...extra]=token.split('.');
 if(extra.length||! /^[a-f0-9-]{36}$/.test(id??'')||! /^[a-f0-9]{48}$/.test(nonce??'')||! /^[a-f0-9]{64}$/.test(mac??''))throw new UnauthorizedException('Invalid ticket');
 const expected=ticketToken(id,nonce,keyId).split('.').at(-1)!;
 if(!timingSafeEqual(Buffer.from(mac,'hex'),Buffer.from(expected,'hex')))throw new UnauthorizedException('Invalid ticket');return {id,nonce,keyId};
}
