'use client';
import {useState,type ReactNode} from 'react';
import {State,Action,platform,usePages,More,money} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
import {useDarkMode} from '../webapp/store/darkMode';
function Form({title,children,save,successMessage="Saved by the server.",submitLabel,className="faji-card faji-stack mt-5"}:{title:string;children:ReactNode;successMessage?:string;submitLabel?:string;className?:string;save:(data:FormData)=>Promise<unknown>}){const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);return <form className={className} onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);try{await save(data);setMessage(successMessage);}catch(error){setMessage(error instanceof Error?error.message:'Unable to save.');}finally{setBusy(false);}}}><h2>{title}</h2>{children}<button className="faji-primary" disabled={busy}>{submitLabel??('Save '+title.toLowerCase())}</button>{message&&<p role="status">{message}</p>}</form>;}
export function SearchFilters({apply}:{apply:(filters:Record<string,string>)=>void}){const [coords,setCoords]=useState({latitude:'',longitude:''}),[error,setError]=useState('');return <details className="faji-card mx-5"><summary>Advanced search & proximity</summary><form className="faji-stack" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget),filters:Record<string,string>={};for(const key of ['location','latitude','longitude','radiusKm']){const value=String(data.get(key)??'').trim();if(value)filters[key]=value;}if(!!filters.latitude!==!!filters.longitude){setError('Enter both latitude and longitude.');return;}setError('');apply(filters);}}><label>City or area<input name="location" maxLength={120}/></label><div className="faji-grid"><label>Latitude<input name="latitude" type="number" step="any" min={-90} max={90} value={coords.latitude} onChange={event=>setCoords({...coords,latitude:event.target.value})}/></label><label>Longitude<input name="longitude" type="number" step="any" min={-180} max={180} value={coords.longitude} onChange={event=>setCoords({...coords,longitude:event.target.value})}/></label><label>Radius (km)<input name="radiusKm" type="number" min={1} max={100} defaultValue={10}/></label></div><button type="button" className="faji-outline" onClick={()=>{if(!navigator.geolocation){setError('Location is unavailable. Enter coordinates manually.');return;}navigator.geolocation.getCurrentPosition(value=>setCoords({latitude:String(value.coords.latitude),longitude:String(value.coords.longitude)}),()=>setError('Location permission denied. Enter coordinates manually.'),{timeout:10000});}}>Use my location</button><button className="faji-primary">Apply search filters</button><button type="reset" className="faji-outline" onClick={()=>{setCoords({latitude:'',longitude:''});apply({});}}>Clear filters</button>{error&&<p role="alert">{error}</p>}</form></details>;}
export function PlanQuote({id,detail}:{id:string;detail:Schema<'OfferingDetail'>}){const [quote,setQuote]=useState<Schema<'PlanQuoteView'>|null>(null);return detail.package?<Form title="Plan quote" submitLabel="Get plan quote" save={async data=>{setQuote(await platform<Schema<'PlanQuoteView'>>(`discovery/plans/${id}/quote`,{guests:Number(data.get('guests')),startsAt:new Date(String(data.get('start'))).toISOString(),addOns:detail.package!.addOns.flatMap(addon=>Number(data.get(addon.catalogueId))>0?[{catalogueId:addon.catalogueId,quantity:Number(data.get(addon.catalogueId))}]:[])}));}}><label>Plan guests<input required name="guests" type="number" min={detail.package.minGuests} max={detail.package.maxGuests} defaultValue={detail.package.minGuests}/></label><label>Plan start<input type="datetime-local" required name="start"/></label>{detail.package.addOns.map(addon=><label key={addon.catalogueId}>{addon.name}<input name={addon.catalogueId} type="number" min={0} max={addon.maxQuantity} defaultValue={0}/></label>)}{quote&&<p role="status">Quoted total: {money(quote.totalMinor,quote.currency)}. Quote only; capacity is not held and no payment has been made.</p>}</Form>:null;}
export function ReviewHistory(){const reviews=usePages<Schema<'PrivateReviewPage'>>('customer/reviews');return <section className="mt-5"><h2>Your reviews</h2><State loading={reviews.loading} error={reviews.error} empty={reviews.data?.items.length===0} retry={reviews.reload}>{reviews.data?.items.map(review=><article className="faji-card" key={review.id}><p>{review.rating}/5 · {review.body}</p><Action label="Delete review" run={()=>platform(`customer/reviews/${review.id}`,undefined,'DELETE')} onSuccess={reviews.reload}/></article>)}</State><More resource={reviews}/></section>;}
export function SavedPlanEditor({plan,reload}:{plan:Schema<'CustomerSavedPlanView'>;reload:()=>void}){return <details><summary>Edit plan & feedback</summary><Form title="Plan revision" save={async data=>{await platform(`plans/${plan.id}`,{occasion:data.get('occasion'),budgetMinor:String(Math.round(Number(data.get('budget'))*100)),currency:plan.currency,guests:Number(data.get('guests')),startsAfter:new Date(String(data.get('start'))).toISOString(),startsBefore:new Date(String(data.get('end'))).toISOString(),...(String(data.get('location')).trim()?{location:String(data.get('location'))}:{}),...(plan.latitude!=null&&plan.longitude!=null?{latitude:plan.latitude,longitude:plan.longitude,radiusKm:plan.radiusKm??10}:{}),categories:plan.categories,attributes:plan.attributes,revision:plan.revision},'PUT');reload();}}><label>Occasion<input name="occasion" required defaultValue={plan.occasion}/></label><label>Budget ({plan.currency})<input type="number" name="budget" min={0} step="0.01" required defaultValue={Number(plan.budgetMinor)/100}/></label><label>Guests<input type="number" name="guests" min={1} max={50} required defaultValue={plan.guests}/></label><label>Location<input name="location" defaultValue={plan.location??''}/></label><label>From<input type="datetime-local" name="start" required defaultValue={localDate(plan.startsAfter)}/></label><label>Until<input type="datetime-local" name="end" required defaultValue={localDate(plan.startsBefore)}/></label></Form><Form title="Plan feedback" save={data=>platform(`plans/${plan.id}/feedback`,{rating:Number(data.get('rating')),comment:String(data.get('comment'))})}><label>Rating<input type="number" name="rating" min={1} max={5} required defaultValue={5}/></label><label>Comment<textarea name="comment" maxLength={500}/></label></Form></details>;}
function localDate(value:string){const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export function PlanFilters({apply}:{apply:(filters:Record<string,string>)=>void}){
 const {dark}=useDarkMode();
 const [error,setError]=useState('');
 const ink=dark?'#F0F0F0':'#1A1A1A',surface=dark?'#1C1C1C':'#FFFFFF',borderColor=dark?'#363636':'#E8E8E8';
 return <details className="relative z-30 shrink-0">
  <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border px-4 text-xs font-bold [&::-webkit-details-marker]:hidden"
   style={{background:surface,borderColor,color:ink}}>
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1.5" fill={surface}/><circle cx="16" cy="12" r="1.5" fill={surface}/><circle cx="12" cy="17" r="1.5" fill={surface}/></svg>
   More filters
  </summary>
  <form className="absolute right-0 top-[calc(100%+10px)] grid w-[min(340px,calc(100vw-32px))] gap-3 rounded-2xl border p-4 shadow-xl"
   style={{background:surface,borderColor,color:ink,colorScheme:dark?'dark':'light'}}
   onSubmit={event=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget),filters:Record<string,string>={};
    for(const key of ['minBudgetMinor','maxBudgetMinor']){
     const value=String(data.get(key)??'').trim();
     if(value)filters[key]=String(Math.round(Number(value)*100));
    }
    const guests=String(data.get('guests')??'').trim();
    if(guests)filters.guests=guests;
    const start=String(data.get('start')??'');
    if(start){
     const date=new Date(start);
     if(Number.isNaN(date.getTime())){setError('Enter a valid availability date.');return;}
     filters.startsAt=date.toISOString();
    }
    if(filters.minBudgetMinor&&filters.maxBudgetMinor&&Number(filters.minBudgetMinor)>Number(filters.maxBudgetMinor)){
     setError('Minimum budget must not exceed maximum budget.');
     return;
    }
    setError('');
    apply(filters);
    event.currentTarget.closest('details')?.removeAttribute('open');
   }}>
   <h2 className="m-0 text-sm font-extrabold" style={{fontSize:14,fontWeight:800,margin:0}}>Plan filters</h2>
   <label className="grid gap-1.5 text-xs font-semibold">Minimum group budget (NGN)
    <input type="number" min={0} name="minBudgetMinor" step="0.01" className="rounded-xl border px-3 py-2.5 text-sm" style={{background:dark?'#111':'#fff',borderColor, color:ink}}/>
   </label>
   <label className="grid gap-1.5 text-xs font-semibold">Maximum group budget (NGN)
    <input type="number" min={0} name="maxBudgetMinor" step="0.01" className="rounded-xl border px-3 py-2.5 text-sm" style={{background:dark?'#111':'#fff',borderColor, color:ink}}/>
   </label>
   <label className="grid gap-1.5 text-xs font-semibold">Guests
    <input type="number" min={1} max={10000} name="guests" placeholder="Any group size" className="rounded-xl border px-3 py-2.5 text-sm" style={{background:dark?'#111':'#fff',borderColor, color:ink}}/>
   </label>
   <label className="grid gap-1.5 text-xs font-semibold">Available after
    <input type="datetime-local" name="start" className="rounded-xl border px-3 py-2.5 text-sm" style={{background:dark?'#111':'#fff',borderColor, color:ink}}/>
   </label>
   {error&&<p className="m-0 text-xs" role="alert" style={{color:'#D92D27'}}>{error}</p>}
   <div className="flex gap-2">
    <button type="button" className="flex-1 rounded-full border px-3 py-2.5 text-xs font-bold" style={{background:'transparent',borderColor,color:ink}}
     onClick={event=>{event.currentTarget.form?.reset();setError('');apply({});event.currentTarget.closest('details')?.removeAttribute('open');}}>Clear</button>
    <button className="flex-1 rounded-full px-3 py-2.5 text-xs font-bold text-white" style={{background:'#FA3F38'}}>Apply filters</button>
   </div>
  </form>
 </details>;
}
export function SupportNotices(){const notices=usePages<Schema<'CustomerSupportNoticePage'>>('customer/support-notifications');if(notices.loading)return null;if(notices.error)return <section className="mt-6"><h2>Support replies</h2><State error={notices.error} retry={notices.reload}/></section>;if(!notices.data?.items.length)return null;return <section className="mt-6"><h2>Support replies</h2>{notices.data.items.map(notice=><article className="faji-card" key={notice.id}><h3>{notice.title}</h3><p>Open Support to view your conversation.</p><Action label={notice.readAt?'Read':'Mark support reply as read'} disabled={!!notice.readAt} run={()=>platform(`customer/support-notifications/${notice.id}/read`,{},'PUT')} onSuccess={notices.reload}/></article>)}<More resource={notices}/></section>;}
