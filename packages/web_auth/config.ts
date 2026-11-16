import 'server-only';
export function authConfiguration(){
 const raw=process.env.FAJI_API_URL, rawOrigin=process.env.FAJI_WEB_ORIGIN;
 if(!raw||!rawOrigin)throw Error('Authentication configuration unavailable');
 const api=new URL(raw),origin=new URL(rawOrigin);
 for(const url of [api,origin])if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw Error('Invalid authentication URL');
 if(process.env.NODE_ENV==='production'){
  if(origin.protocol!=='https:')throw Error('HTTPS web origin required');
  if(api.protocol!=='https:'&&process.env.FAJI_ALLOW_INTERNAL_HTTP!=='true')throw Error('HTTPS API required');
 }
 return {api,origin:origin.origin};
}
export function authCookies(value:string){return value.split(';').map(v=>v.trim()).filter(v=>/^(?:__Secure-|__Host-)?better-auth\.[a-zA-Z0-9_.-]+=/.test(v)).join('; ');}
