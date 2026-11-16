'use client';
import {useState,useRef,useCallback,useEffect} from 'react';
import dynamic from 'next/dynamic';
import {State,useResource} from '@faji/web-ui/client';
import {journey} from './journeys';
import type {OnboardingDraft} from '../webapp/screens/BusinessOnboardingScreen';
const Wizard=dynamic(()=>import('../webapp/screens/BusinessOnboardingScreen'),{ssr:false});
type Saved={revision:number;data:OnboardingDraft};
type Props={onBack:()=>void;onComplete:(draft?:{businessName:string;draftRevision?:number})=>Promise<void>;submitting:boolean};
export default function DraftOnboarding(props:Props){
 const saved=useResource<{data:Saved}>('business/onboarding/draft/current');
 return <State loading={saved.loading} error={saved.error} retry={saved.reload}>{saved.data&&<DraftWizard key={JSON.stringify(saved.data.data)} initial={saved.data.data} {...props}/>}</State>;
}
function DraftWizard({initial,onBack,onComplete,submitting}:Props&{initial:Saved}){
 const revision=useRef(initial.revision),queue=useRef(Promise.resolve()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),latest=useRef(initial.data),busy=useRef(false),mounted=useRef(true);
 const [status,setStatus]=useState('Draft loaded.'),[failed,setFailed]=useState(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const flush=useCallback(async()=>{
  if(timer.current)clearTimeout(timer.current);
  const draft=latest.current;
  const operation=queue.current.then(async()=>{
   const result=await journey<Saved>('business/onboarding/draft/current',{...draft,revision:revision.current},'PUT');
   revision.current=result.revision;
   if(mounted.current){setStatus('Draft saved.');setFailed(false);}
  });
  queue.current=operation.catch(()=>{});
  try{await operation;}catch(error){if(mounted.current){setFailed(true);setStatus(error instanceof Error?error.message:'Draft could not be saved.');}throw error;}
 },[]);
 const save=useCallback((draft:OnboardingDraft)=>{latest.current=draft;if(timer.current)clearTimeout(timer.current);setStatus('Saving draft…');timer.current=setTimeout(()=>{void flush().catch(()=>{});},700);},[flush]);
 return <><div className="preview-notice"><p role="status">{status}</p>{failed&&<><button className="faji-outline" onClick={()=>void flush().catch(()=>{})}>Retry saving draft</button><p>For a changed draft, reload to recover the latest saved version before editing again.</p></>}</div><Wizard initialDraft={initial.data} onDraftChange={save} connected submitting={submitting} onBack={()=>{void flush().then(onBack).catch(()=>{});}} onComplete={async draft=>{
  if(busy.current)return;busy.current=true;
  try{await flush();await onComplete(draft?{...draft,draftRevision:revision.current}:undefined);}catch{/* Keep the wizard and recovery actions visible. */}finally{busy.current=false;}
 }}/></>;
}
