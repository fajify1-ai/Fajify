import {BlockList,isIP} from 'node:net';
import type {IncomingHttpHeaders} from 'node:http';
export function trustedProxies(value=process.env.FAJI_TRUSTED_PROXY_CIDRS??''){
 const proxies=new BlockList();
 for(const cidr of value.split(',').map(v=>v.trim()).filter(Boolean)){const [ip,prefix]=cidr.split('/');if(!isIP(ip)||prefix===undefined)throw Error('Invalid trusted proxy CIDR');proxies.addSubnet(ip,Number(prefix),isIP(ip)===6?'ipv6':'ipv4');}
 return proxies;
}
export function requestIp(req:{headers:IncomingHttpHeaders;socket:{remoteAddress?:string}},proxies=trustedProxies()){
 const remote=(req.socket.remoteAddress??'127.0.0.1').replace(/^::ffff:/,'');const forwarded=req.headers['x-faji-client-ip'];
 return proxies.check(remote,isIP(remote)===6?'ipv6':'ipv4')&&typeof forwarded==='string'&&isIP(forwarded)?forwarded:remote;
}
