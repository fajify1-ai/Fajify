export function normalizeAuthenticationOrigin(value:string):string{
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol))throw new Error('Invalid authentication origin');
 return url.origin;
}

export function normalizeAuthenticationOrigins(value:string):string[]{
 const entries=value.split(',').map(entry=>entry.trim());
 if(!entries.length||entries.some(entry=>!entry))throw new Error('Configure authentication web origins');
 return [...new Set(entries.map(normalizeAuthenticationOrigin))];
}
