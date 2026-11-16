'use client';
import { useEffect,useState,useCallback,type ReactNode } from 'react';
export class PlatformError extends Error { constructor(message:string,public status:number){super(message);} }
export async function platform<T>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
 const response=await fetch('/api/platform/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();
 if(!response.ok)throw new PlatformError(result?.message??'Request unavailable.',response.status);
 return result as T;
}
export function useResource<T>(path:string|null){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(!!path),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setData(null);setError('');if(!path){setLoading(false);return;}setLoading(true);platform<T>(path).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[path,revision]);
 return {data,error,loading,reload:useCallback(()=>setRevision(value=>value+1),[])};
}
export function State({loading,error,empty,retry,children}:{loading?:boolean;error?:string;empty?:boolean;retry?:()=>void;children?:ReactNode}){
 if(loading)return <div className="connection-state" role="status" aria-live="polite">Loading…</div>;
 if(error)return <div className="connection-state" role="alert"><p>{error}</p>{retry&&<button className="faji-outline" onClick={retry}>Try again</button>}<a href="/login">Sign in</a></div>;
 if(empty)return <div className="connection-state"><p>Nothing here yet.</p><p>Available items will appear here when published.</p></div>;
 return <>{children}</>;
}
export function ComingSoon({title='Rider & Dispatch',onBack}:{title?:string;onBack?:()=>void}){return <section className="connection-state"><div className="coming-mark" aria-hidden="true">f.</div><h1>{title}</h1><p>Coming Soon</p><p>Rides, courier assignment and tracking are deferred.</p>{onBack?<button className="faji-primary" onClick={onBack}>Back to homepage</button>:<a className="faji-primary" href="/">Back to homepage</a>}</section>;}
export function money(value:string|number,currency='NGN') {const n=Number(value)/100;return Number.isFinite(n)?new Intl.NumberFormat('en-NG',{style:'currency',currency}).format(n):'Price unavailable';}
export function requestKey(){return crypto.randomUUID();}
export function Action({label,run,onSuccess,disabled=false}:{label:string;run:()=>Promise<unknown>;onSuccess?:()=>void;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div><button className="faji-primary" disabled={disabled||busy} onClick={async()=>{setBusy(true);setError('');try{await run();onSuccess?.();}catch(e){setError(e instanceof Error?e.message:'Unable to complete.');}finally{setBusy(false);}}}>{busy?'Please wait…':label}</button>{error&&<p role="alert">{error}</p>}</div>;
}
