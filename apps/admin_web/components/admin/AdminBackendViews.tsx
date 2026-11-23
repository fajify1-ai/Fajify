'use client';

import {useEffect,useRef,useState} from 'react';
import {Activity,AlertTriangle,Check,ChevronRight,RefreshCw,ShieldAlert} from 'lucide-react';
import {toast} from 'sonner';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '../ui/card';
import {Input} from '../ui/input';
import {Skeleton} from '../ui/skeleton';
import {adminRequest,type AdminPage,useAdminCommand} from '../../lib/admin-api';
import type {AdminView} from './types';

type Row=Record<string,unknown>;
type SupportMessage={id:string;body:string;authorKind:string;createdAt:string};
type SupportDetail=Row&{messages:AdminPage<SupportMessage>};
type AdminViewWithApi=Exclude<AdminView,'overview'|'applications'|'payments'|'settings'>;
type RequestState<T>={data:T|null;loading:boolean;error:string|null};
const nextIncidentStates:Record<string,string[]>={open:['investigating','resolved'],investigating:['mitigated','resolved'],mitigated:['investigating','resolved'],resolved:['investigating']};

function useResource<T>(path:string|null){
 const [state,setState]=useState<RequestState<T>>({data:null,loading:false,error:null});
 const [version,setVersion]=useState(0);
 useEffect(()=>{
  if(!path){setState({data:null,loading:false,error:null});return;}
  let active=true;
  setState(current=>({...current,loading:true,error:null}));
  void adminRequest<T>(path).then(data=>{
   if(active)setState({data,loading:false,error:null});
  }).catch(error=>{
   if(active)setState(current=>({...current,loading:false,error:error instanceof Error?error.message:'Unable to load administration data.'}));
  });
  return ()=>{active=false;};
 },[path,version]);
 return {...state,refresh:()=>setVersion(value=>value+1)};
}

function usePage<T extends Row>(path:string|null){
 const [page,setPage]=useState<AdminPage<T>>({items:[],nextOffset:null});
 const [loading,setLoading]=useState(true);
 const [loadingMore,setLoadingMore]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [moreError,setMoreError]=useState<string|null>(null);
 const [version,setVersion]=useState(0);
 const latest=useRef({path,version});
 latest.current={path,version};
 useEffect(()=>{
  if(!path){setPage({items:[],nextOffset:null});setLoading(false);setLoadingMore(false);setError(null);setMoreError(null);return;}
  let active=true;
  setLoading(true);
  setLoadingMore(false);
  setError(null);
  setMoreError(null);
  void adminRequest<AdminPage<T>>(path).then(result=>{
   if(active){setPage(result);setLoading(false);}
  }).catch(reason=>{
   if(active){setError(reason instanceof Error?reason.message:'Unable to load administration data.');setLoading(false);}
  });
  return ()=>{active=false;};
 },[path,version]);
 async function loadMore(){
  if(!path||page.nextOffset===null||loadingMore)return;
  const requestPath=path,requestVersion=version;
  const [route,query='']=path.split('?');
  const parameters=new URLSearchParams(query);
  parameters.set('offset',String(page.nextOffset));
  setLoadingMore(true);
  setMoreError(null);
  try{
   const next=await adminRequest<AdminPage<T>>(`${route}?${parameters.toString()}`);
   if(latest.current.path!==requestPath||latest.current.version!==requestVersion)return;
   const keyOf=(item:Row)=>String(item.id??`${String(item.resourceType??'')}:${String(item.resourceId??'')}`);
   const known=new Set(page.items.map(keyOf));
   setPage(current=>({items:[...current.items,...next.items.filter(item=>!known.has(keyOf(item)))],nextOffset:next.nextOffset}));
  }catch(reason){if(latest.current.path===requestPath&&latest.current.version===requestVersion)setMoreError(reason instanceof Error?reason.message:'Unable to load additional records.');}
  finally{if(latest.current.path===requestPath&&latest.current.version===requestVersion)setLoadingMore(false);}
 }
 return {page,hasMore:page.nextOffset!==null,loading,error,moreError,loadingMore,loadMore,refresh:()=>setVersion(value=>value+1)};
}

function PageFrame({title,description,loading,error,onRefresh,children,hasMore,loadingMore,moreError,onLoadMore}:{
 title:string;description:string;loading:boolean;error:string|null;onRefresh:()=>void;children:React.ReactNode;
 hasMore?:boolean;loadingMore?:boolean;moreError?:string|null;onLoadMore?:()=>void;
}){
 return <Card>
  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
   <div><CardTitle>{title}</CardTitle><CardDescription className="mt-1 max-w-3xl">{description}</CardDescription></div>
   <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className="size-3.5"/>Refresh</Button>
  </CardHeader>
  <CardContent>
   {loading?<div className="space-y-3">{Array.from({length:3},(_,index)=><Skeleton key={index} className="h-16 w-full"/>)}</div>
   :error?<div className="rounded-lg border border-destructive/30 bg-accent/40 p-4 text-sm text-accent-foreground" role="alert">{error}</div>
   :<>{children}{hasMore&&onLoadMore&&<div className="mt-4 border-t pt-4 text-center">{moreError&&<p role="alert" className="mb-2 text-sm text-destructive">{moreError}</p>}<Button type="button" variant="outline" size="sm" onClick={onLoadMore} disabled={loadingMore}>{loadingMore?'Loading…':'Load more records'}<ChevronRight className="size-3.5"/></Button></div>}</>}
  </CardContent>
 </Card>;
}

function RecordFields({record,fields}:{record:Row;fields:string[]}){
 return <dl className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
  {fields.map(key=>{
   const value=record[key];
   return <div key={key} className="min-w-0">
    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{key.replace(/[A-Z]/g,letter=>' '+letter).replaceAll('_',' ')}</dt>
    <dd className="mt-1 break-words text-sm">{value===null||value===undefined||value===''?<span className="text-muted-foreground">Not provided</span>:typeof value==='object'?<pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(value,null,2)}</pre>:/Minor$/.test(key)&&Number.isFinite(Number(value))?new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(Number(value)/100):/(At|Date)$/.test(key)&&typeof value==='string'&&!Number.isNaN(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):String(value)}</dd>
   </div>;
  })}
 </dl>;
}

function Empty({children}:{children:React.ReactNode}){
 return <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function CommandForm({children,onSubmit,submitLabel='Save changes'}:{children:React.ReactNode;onSubmit:(form:HTMLFormElement)=>Promise<void>;submitLabel?:string}){
 const [busy,setBusy]=useState(false);
 return <form className="space-y-3" onSubmit={async event=>{
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  try{await onSubmit(event.currentTarget);}finally{setBusy(false);}
 }}>
  {children}
  <Button type="submit" size="sm" disabled={busy}>{busy?'Saving…':submitLabel}</Button>
 </form>;
}

function GovernanceWorkspace({view}:{view:'reviews'|'restrictions'}){
 const isReviews=view==='reviews';
 const path=isReviews?'admin/governance/reviews?limit=30&offset=0':'admin/governance/restrictions?limit=30&offset=0';
 const {page,loading,error,refresh,hasMore,loadingMore,moreError,loadMore}=usePage<Row>(path);
 const run=useAdminCommand();
 async function moderate(form:HTMLFormElement,id:string){
  const values=new FormData(form);
  try{
   const result=await run<{changed:boolean;moderationStatus:string}>(`admin/governance/reviews/${id}/moderation`,{
    visibility:String(values.get('visibility')),reason:String(values.get('reason'))
   });
   toast.success(result.changed?'Review moderation saved.':'The review already has that visibility.');
   form.reset();
   refresh();
  }catch(reason){toast.error(reason instanceof Error?reason.message:'Unable to moderate this review.');}
 }
 async function restrict(form:HTMLFormElement){
  const values=new FormData(form),type=String(values.get('resourceType'));
  const id=String(values.get('resourceId')).trim();
  try{
   const result=await run<{changed:boolean;restricted:boolean}>(`admin/governance/${type}/${id}/restriction`,{
    restricted:values.get('restricted')==='true',reason:String(values.get('reason'))
   });
   toast.success(result.changed?'Marketplace restriction updated.':'No restriction change was needed.');
   form.reset();
   refresh();
  }catch(reason){toast.error(reason instanceof Error?reason.message:'Unable to update this restriction.');}
 }
 return <div className="space-y-5">
  {isReviews?<PageFrame title="Customer reviews" description="Moderate customer reviews using the audited governance workflow. Each change requires a reason." loading={loading} error={error} onRefresh={refresh} hasMore={hasMore} loadingMore={loadingMore} moreError={moreError} onLoadMore={()=>void loadMore()}>
   {page.items.length?<div className="space-y-3">{page.items.map(review=><article key={String(review.id)} className="rounded-xl border p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Badge variant={review.moderationStatus==='hidden'?'warning':'outline'}>{String(review.moderationStatus)}</Badge><span className="font-mono text-[11px] text-muted-foreground">{String(review.id)}</span></div>
    <RecordFields record={review} fields={['businessId','branchId','rating','body','createdAt']}/>
    <div className="mt-4 border-t pt-4">
     <CommandForm onSubmit={form=>moderate(form,String(review.id))} submitLabel="Record moderation">
      <div className="grid gap-3 sm:grid-cols-2">
       <label className="space-y-1 text-xs font-medium">Visibility<select name="visibility" defaultValue={review.moderationStatus==='hidden'?'visible':'hidden'} className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"><option value="hidden">Hide review</option><option value="visible">Show review</option></select></label>
       <label className="space-y-1 text-xs font-medium">Reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Explain the moderation decision"/></label>
      </div>
     </CommandForm>
    </div>
   </article>)}</div>:<Empty>No customer reviews were returned.</Empty>}
  </PageFrame>:<>
   <Card>
    <CardHeader><CardTitle>Restrict a marketplace resource</CardTitle><CardDescription>Restriction and restoration commands are audited. Only branch and catalogue resource IDs are accepted.</CardDescription></CardHeader>
    <CardContent><CommandForm onSubmit={restrict} submitLabel="Apply restriction change">
     <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-xs font-medium">Resource type<select name="resourceType" className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"><option value="branches">Business branch</option><option value="catalogue">Catalogue item</option></select></label>
      <label className="space-y-1 text-xs font-medium">Resource ID<Input name="resourceId" required pattern="[A-Fa-f0-9-]{36}" placeholder="UUID"/></label>
      <label className="space-y-1 text-xs font-medium">Action<select name="restricted" className="h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground"><option value="true">Restrict</option><option value="false">Restore prior state</option></select></label>
     </div>
     <label className="block space-y-1 text-xs font-medium">Reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Explain the governance decision"/></label>
    </CommandForm></CardContent>
   </Card>
   <PageFrame title="Active marketplace restrictions" description="Currently restricted marketplace resources and the recorded reasons." loading={loading} error={error} onRefresh={refresh} hasMore={hasMore} loadingMore={loadingMore} moreError={moreError} onLoadMore={()=>void loadMore()}>
    {page.items.length?<div className="space-y-3">{page.items.map(item=><article key={String(item.resourceId)} className="rounded-xl border p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="warning">{String(item.resourceType)}</Badge><span className="font-mono text-xs">{String(item.resourceId)}</span></div><RecordFields record={item} fields={['reason','changedBy','updatedAt']}/></article>)}</div>:<Empty>There are no active marketplace restrictions.</Empty>}
   </PageFrame>
  </>}
 </div>;
}

function SupportWorkspace(){
 const [state,setState]=useState<'open'|'closed'>('open');
 const {page,loading,error,refresh,hasMore,loadingMore,moreError,loadMore}=usePage<Row>(`admin/support/cases?state=${state}&limit=30&offset=0`);
 const [selected,setSelected]=useState<string|null>(null);
 const detail=useResource<SupportDetail>(selected?`admin/support/cases/${selected}?limit=30&offset=0`:null);
 const run=useAdminCommand();
 async function command(form:HTMLFormElement,path:string,payload:Record<string,unknown>,success:string){
  try{await run(path,payload);toast.success(success);form.reset();refresh();if(selected)detail.refresh();}
  catch(error){toast.error(error instanceof Error?error.message:'Unable to update the support case.');}
 }
 return <div className="space-y-5">
  <Card>
   <CardHeader className="flex-row items-center justify-between gap-4"><div><CardTitle>Support cases</CardTitle><CardDescription className="mt-1">Review cases, inspect their message history, and use audited replies and status changes.</CardDescription></div><select aria-label="Case status" value={state} onChange={event=>{setState(event.target.value as 'open'|'closed');setSelected(null);}} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="open">Open</option><option value="closed">Closed</option></select></CardHeader>
   <CardContent>{loading?<Skeleton className="h-24 w-full"/>:error?<p role="alert" className="text-sm text-destructive">{error}</p>:page.items.length?<><div className="grid gap-3 lg:grid-cols-2">{page.items.map(item=><button type="button" key={String(item.id)} onClick={()=>setSelected(String(item.id))} className="rounded-xl border p-4 text-left transition-colors hover:bg-muted/40">
    <div className="mb-2 flex items-center justify-between gap-2"><span className="truncate font-medium">{String(item.subject)}</span><Badge variant={item.status==='open'?'success':'outline'}>{String(item.status)}</Badge></div><RecordFields record={item} fields={['id','customerSubject','category','priority','assignedTo','updatedAt']}/>
   </button>)}</div>{hasMore&&<div className="mt-4 border-t pt-4 text-center">{moreError&&<p role="alert" className="mb-2 text-sm text-destructive">{moreError}</p>}<Button type="button" variant="outline" size="sm" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?'Loading…':'Load more cases'}<ChevronRight className="size-3.5"/></Button></div>}</>:<Empty>No {state} support cases were returned.</Empty>}</CardContent>
  </Card>
  {selected&&<Card>
   <CardHeader><CardTitle>Case details</CardTitle><CardDescription className="font-mono">{selected}</CardDescription></CardHeader>
   <CardContent className="space-y-5">
    {detail.loading?<Skeleton className="h-28 w-full"/>:detail.error?<p role="alert" className="text-sm text-destructive">{detail.error}</p>:detail.data&&<>
     <RecordFields record={detail.data} fields={['customerSubject','category','resourceId','subject','status','assignedTo','priority','createdAt','updatedAt']}/>
     <div className="space-y-2 border-t pt-4"><h3 className="text-sm font-semibold">Messages</h3>{detail.data.messages.items.length?detail.data.messages.items.map(message=><div key={message.id} className="rounded-lg bg-muted/40 p-3"><p className="whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-2 text-[11px] text-muted-foreground">{message.authorKind} · {message.createdAt}</p></div>):<Empty>No case messages were returned.</Empty>}</div>
     {detail.data.status==='open'&&<div className="grid gap-5 border-t pt-4 lg:grid-cols-2">
      <CommandForm onSubmit={form=>command(form,`admin/support/cases/${selected}/messages`,{message:String(new FormData(form).get('message'))},'Support reply sent.')} submitLabel="Send reply"><label className="block space-y-1 text-xs font-medium">Reply<Input name="message" minLength={1} maxLength={4000} required placeholder="Write a customer-facing reply"/></label></CommandForm>
      <CommandForm onSubmit={form=>{const values=new FormData(form);return command(form,`admin/support/cases/${selected}/assignment`,{assignee:String(values.get('assignee')).trim()||null,priority:String(values.get('priority')),reason:String(values.get('reason'))},'Support case assignment saved.');}} submitLabel="Save assignment">
       <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Admin assignee subject<Input name="assignee" maxLength={255} placeholder="Optional subject ID"/></label><label className="space-y-1 text-xs font-medium">Priority<select name="priority" defaultValue={String(detail.data.priority)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></label></div>
       <label className="block space-y-1 text-xs font-medium">Reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Reason for assignment or priority"/></label>
      </CommandForm>
      <CommandForm onSubmit={form=>command(form,`admin/support/cases/${selected}/status`,{status:'closed',reason:String(new FormData(form).get('reason'))},'Support case closed.')} submitLabel="Close case"><label className="block space-y-1 text-xs font-medium">Closure reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Explain why the case is being closed"/></label></CommandForm>
     </div>}
     {detail.data.status==='closed'&&<CommandForm onSubmit={form=>command(form,`admin/support/cases/${selected}/status`,{status:'open',reason:String(new FormData(form).get('reason'))},'Support case reopened.')} submitLabel="Reopen case"><label className="block space-y-1 text-xs font-medium">Reopen reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Explain why the case is being reopened"/></label></CommandForm>}
    </>}
   </CardContent>
  </Card>}
 </div>;
}

function IncidentsWorkspace(){
 const {page,loading,error,refresh,hasMore,loadingMore,moreError,loadMore}=usePage<Row>('admin/incidents?limit=30&offset=0');
 const run=useAdminCommand();
 async function create(form:HTMLFormElement){
  const values=new FormData(form),resourceId=String(values.get('resourceId')).trim();
  try{await run('admin/incidents',{incidentType:String(values.get('incidentType')),resourceId:resourceId||undefined,summary:String(values.get('summary')),severity:String(values.get('severity'))});toast.success('Incident created.');form.reset();refresh();}
  catch(error){toast.error(error instanceof Error?error.message:'Unable to create the incident.');}
 }
 async function transition(form:HTMLFormElement,id:string){
  const values=new FormData(form);
  try{await run(`admin/incidents/${id}/status`,{state:String(values.get('state')),reason:String(values.get('reason'))});toast.success('Incident state updated.');form.reset();refresh();}
  catch(error){toast.error(error instanceof Error?error.message:'Unable to update the incident.');}
 }
 return <div className="space-y-5">
  <Card><CardHeader><CardTitle>Record an incident</CardTitle><CardDescription>Incident commands are audited; external-resource linkage is limited by the API to verified order, booking, and ride records.</CardDescription></CardHeader>
   <CardContent><CommandForm onSubmit={create} submitLabel="Create incident">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     <label className="space-y-1 text-xs font-medium">Incident type<select name="incidentType" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>platform</option><option>security</option><option>provider</option><option>booking</option><option>order</option><option>ride</option></select></label>
     <label className="space-y-1 text-xs font-medium">Severity<select name="severity" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label>
     <label className="space-y-1 text-xs font-medium">Resource ID (optional)<Input name="resourceId" pattern="[A-Fa-f0-9-]{36}" placeholder="Verified resource UUID"/></label>
     <label className="space-y-1 text-xs font-medium">Summary<Input name="summary" minLength={8} maxLength={200} required placeholder="Concise incident summary"/></label>
    </div>
   </CommandForm></CardContent>
  </Card>
  <PageFrame title="Incident register" description="Track platform incidents and move them through API-enforced state transitions." loading={loading} error={error} onRefresh={refresh} hasMore={hasMore} loadingMore={loadingMore} moreError={moreError} onLoadMore={()=>void loadMore()}>
   {page.items.length?<div className="space-y-3">{page.items.map(item=>{const choices=nextIncidentStates[String(item.state)]??[];return <article key={String(item.id)} className="rounded-xl border p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant={item.severity==='critical'||item.severity==='high'?'warning':'outline'}>{String(item.severity)}</Badge><Badge variant="outline">{String(item.state)}</Badge><span className="font-mono text-[11px] text-muted-foreground">{String(item.id)}</span></div><RecordFields record={item} fields={['incidentType','resourceId','summary','assignedTo','createdAt','updatedAt']}/>{choices.length>0&&<CommandForm onSubmit={form=>transition(form,String(item.id))} submitLabel="Update incident state"><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-medium">Next state<select name="state" defaultValue={choices[0]} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{choices.map(next=><option key={next}>{next}</option>)}</select></label><label className="space-y-1 text-xs font-medium">Reason<Input name="reason" minLength={8} maxLength={500} required placeholder="Reason for the state change"/></label></div></CommandForm>}</article>;})}</div>:<Empty>No incidents were returned.</Empty>}
  </PageFrame>
 </div>;
}

function MonitoringWorkspace(){
 const status=useResource<Row>('admin/monitoring/status');
 const {page,loading,error,refresh,hasMore,loadingMore,moreError,loadMore}=usePage<Row>('admin/monitoring/alerts?limit=30&offset=0');
 const [checking,setChecking]=useState(false);
 const run=useAdminCommand();
 async function check(){
  if(checking)return;
  setChecking(true);
  try{const result=await adminRequest<{opened:string[];cleared:string[]}>('admin/monitoring/check',{});toast.success(`Monitoring check completed. ${result.opened.length} opened, ${result.cleared.length} cleared.`);status.refresh();refresh();}
  catch(error){toast.error(error instanceof Error?error.message:'Monitoring check failed.');}
  finally{setChecking(false);}
 }
 async function acknowledge(id:string){
  try{await run(`admin/monitoring/alerts/${id}/acknowledgement`,{});toast.success('Alert acknowledged.');refresh();}
  catch(error){toast.error(error instanceof Error?error.message:'Unable to acknowledge the alert.');}
 }
 return <div className="space-y-5">
  <Card><CardHeader className="flex-row items-start justify-between"><div><CardTitle>Platform health signals</CardTitle><CardDescription className="mt-1">Database-derived operational signals only; provider health remains explicitly unverified.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={check} disabled={checking}><Activity className="size-3.5"/>{checking?'Checking…':'Run check'}</Button></CardHeader>
   <CardContent>{status.loading?<Skeleton className="h-24 w-full"/>:status.error?<p role="alert" className="text-sm text-destructive">{status.error}</p>:status.data?<><RecordFields record={status.data} fields={['deadFinanceJobs','expiredFinanceLeases','overdueFinanceJobs','openFinanceExceptions','staleOutboxEvents','openUrgentRideIncidents','providerHealth','checkedAt']}/></>:<Empty>No monitoring status was returned.</Empty>}</CardContent>
  </Card>
  <PageFrame title="Monitoring alerts" description="Acknowledge alerts after reviewing them. Acknowledgement is an audited command and does not resolve an incident." loading={loading} error={error} onRefresh={refresh} hasMore={hasMore} loadingMore={loadingMore} moreError={moreError} onLoadMore={()=>void loadMore()}>
   {page.items.length?<div className="space-y-3">{page.items.map(item=><article key={String(item.id)} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning text-warning-foreground"><ShieldAlert className="size-5"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="warning">{String(item.severity)}</Badge><Badge variant="outline">{String(item.state)}</Badge><span className="font-mono text-[10px] text-muted-foreground">{String(item.id)}</span></div><p className="mt-2 text-sm font-medium">{String(item.summary)}</p><p className="mt-1 text-xs text-muted-foreground">{String(item.createdAt)} · {item.acknowledgedAt?`Acknowledged ${String(item.acknowledgedAt)}`:'Not acknowledged'}</p></div>{!item.acknowledgedAt&&<Button type="button" size="sm" variant="outline" onClick={()=>void acknowledge(String(item.id))}><Check className="size-3.5"/>Acknowledge</Button>}</article>)}</div>:<Empty>No monitoring alerts were returned.</Empty>}
  </PageFrame>
 </div>;
}

function InsightsWorkspace({view}:{view:'customers'|'businesses'|'rides'|'reports'|'audit'|'integrations'}){
 const [days,setDays]=useState('30');
 const [appliedDays,setAppliedDays]=useState('30');
 const report=useResource<Row>(view==='reports'||view==='rides'?`admin/reports/overview?days=${view==='reports'?appliedDays:30}`:null);
 const finance=useResource<Row>(view==='reports'?'admin/finance/summary':null);
 const consistency=useResource<Row>(view==='integrations'?'admin/integrations/consistency':null);
 const [lookup,setLookup]=useState('');
 const [submitted,setSubmitted]=useState('');
 const business=useResource<Row>(view==='businesses'&&submitted?`admin/reports/businesses/${encodeURIComponent(submitted)}`:null);
 const activity=usePage<Row>(view==='customers'&&submitted?`admin/integrations/customers/${encodeURIComponent(submitted)}/activity?limit=30&offset=0`:null);
 const [auditMode,setAuditMode]=useState<'security'|'commands'>('security');
 const audit=usePage<Row>(view==='audit'?`admin/operations/${auditMode==='security'?'audit':'command-audit'}?limit=30&offset=0`:null);
 const runLookup=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setSubmitted(lookup.trim());};
 if(view==='reports'||view==='rides')return <div className="space-y-5">
  {view==='reports'&&<Card><CardHeader><CardTitle>Reporting period</CardTitle><CardDescription>Counts use each source record’s creation or verification time as defined by the reporting API.</CardDescription></CardHeader><CardContent><form className="flex flex-wrap items-end gap-3" onSubmit={event=>{event.preventDefault();setAppliedDays(days);if(days===appliedDays)report.refresh();finance.refresh();}}><label className="space-y-1 text-xs font-medium">Lookback days (1–90)<Input type="number" min={1} max={90} value={days} onChange={event=>setDays(event.target.value)} required/></label><Button type="submit" variant="outline">Refresh range</Button></form></CardContent></Card>}
  <div className="grid gap-5 xl:grid-cols-2">
   <InsightCard title={view==='rides'?'Ride activity (30 days)':'Platform activity'} description="Live, API-calculated reporting data." state={report} refresh={report.refresh} fields={view==='rides'?['requestedRides','completedRides','verifiedRideGrossMinor','currency']:['days','customers','approvedBusinesses','createdOrders','createdReservations','issuedTickets','requestedRides','completedRides','verifiedRideGrossMinor','verifiedCaptureMinor','ledgerPlatformRevenueMinor','currency']}/>
   {view==='reports'&&<InsightCard title="Verified finance summary" description="Totals include verified capture and final settlement records, not browser-side claims." state={finance} refresh={finance.refresh} fields={['capturedMinor','refundedMinor','settledMinor','openReconciliationCases','openDisputes','uncertainRefunds','reconciledRideDriverPayoutMinor']}/>}
  </div>
 </div>;
 if(view==='businesses')return <div className="space-y-5">
  <Card><CardHeader><CardTitle>Business performance lookup</CardTitle><CardDescription>Look up an existing business report by its UUID. This is not a business directory.</CardDescription></CardHeader><CardContent><form className="flex flex-col gap-3 sm:flex-row" onSubmit={runLookup}><Input value={lookup} onChange={event=>setLookup(event.target.value)} required pattern="[A-Fa-f0-9-]{36}" placeholder="Business UUID" aria-label="Business UUID"/><Button type="submit">Load report</Button></form></CardContent></Card>
  <InsightCard title="Business report" description={submitted||'Enter a business UUID to retrieve its verified report.'} state={business} refresh={business.refresh} fields={['id','displayName','status','activeBranches','fulfilledOrders','completedReservations','linkedCustomerRides','verifiedCapturedMinor','processedRefundMinor','settledMinor','currency']}/>
 </div>;
 if(view==='customers')return <div className="space-y-5">
  <Card><CardHeader><CardTitle>Customer activity lookup</CardTitle><CardDescription>Reads a customer’s cross-domain activity. Every lookup is recorded in the administrative action history.</CardDescription></CardHeader><CardContent><form className="flex flex-col gap-3 sm:flex-row" onSubmit={runLookup}><Input value={lookup} onChange={event=>setLookup(event.target.value)} required pattern="[A-Za-z0-9_-]{1,255}" placeholder="Customer subject ID" aria-label="Customer subject ID"/><Button type="submit">Load activity</Button></form></CardContent></Card>
  <PageFrame title="Customer activity" description={submitted||'Enter a customer subject ID to view its recent activity.'} loading={activity.loading} error={activity.error} onRefresh={activity.refresh} hasMore={activity.page.nextOffset!==null} loadingMore={activity.loadingMore} moreError={activity.moreError} onLoadMore={()=>void activity.loadMore()}>{activity.page.items.length?<div className="space-y-3">{activity.page.items.map(item=><article key={String(item.id)} className="rounded-lg border p-4"><RecordFields record={item} fields={['kind','status','createdAt','id']}/></article>)}</div>:submitted?<Empty>No customer activity records were returned.</Empty>:<Empty>Customer lookups are audited and use the backend’s restricted activity endpoint.</Empty>}</PageFrame>
 </div>;
 if(view==='audit')return <PageFrame title="Administrative audit history" description="Review security events and audited privileged commands. Sensitive payloads are not returned." loading={audit.loading} error={audit.error} onRefresh={audit.refresh} hasMore={audit.page.nextOffset!==null} loadingMore={audit.loadingMore} moreError={audit.moreError} onLoadMore={()=>void audit.loadMore()}>
  <div className="mb-4 flex gap-2"><Button type="button" size="sm" variant={auditMode==='security'?'default':'outline'} onClick={()=>setAuditMode('security')}>Security events</Button><Button type="button" size="sm" variant={auditMode==='commands'?'default':'outline'} onClick={()=>setAuditMode('commands')}>Admin commands</Button></div>
  {audit.page.items.length?<div className="space-y-3">{audit.page.items.map(item=><article key={String(item.id)} className="rounded-lg border p-4"><RecordFields record={item} fields={Object.keys(item)}/></article>)}</div>:<Empty>No audit events were returned.</Empty>}
 </PageFrame>;
 if(view==='integrations')return <InsightCard title="Cross-domain consistency" description="Read-only checks identify inconsistencies; they do not repair financial, reservation, or planning records." state={consistency} refresh={consistency.refresh} fields={['confirmedUnverifiedHolds','unpostedVerifiedCaptures','orphanPlanHolds','packageHoldsMissingComponents','linksWithCancelledRides','linksWithCancelledReservations']}/>;
 return null;
}

function InsightCard({title,description,state,refresh,fields}:{title:string;description:string;state:RequestState<Row>;refresh:()=>void;fields:string[]}){
 return <PageFrame title={title} description={description} loading={state.loading} error={state.error} onRefresh={refresh}>{state.data?<RecordFields record={state.data} fields={fields}/>:<Empty>{description}</Empty>}</PageFrame>;
}

export function AdminOverviewData(){
 const operations=useResource<Row>('admin/operations/overview');
 return <InsightCard title="Backend operational summary" description="Counts read from the protected Platform Admin operations API." state={operations} refresh={operations.refresh} fields={['pendingBusinessApprovals','openSupportCases','hiddenReviews']}/>;
}

export default function AdminBackendViews({view}:{view:AdminViewWithApi}){
 if(view==='reviews'||view==='restrictions')return <GovernanceWorkspace view={view}/>;
 if(view==='support')return <SupportWorkspace/>;
 if(view==='incidents')return <IncidentsWorkspace/>;
 if(view==='monitoring')return <MonitoringWorkspace/>;
 if(view==='customers'||view==='businesses'||view==='rides'||view==='reports'||view==='audit'||view==='integrations')return <InsightsWorkspace view={view}/>;
 return <Card><CardContent className="p-6"><AlertTriangle className="size-5 text-muted-foreground"/><p className="mt-2 text-sm text-muted-foreground">No admin API is connected to this section yet.</p></CardContent></Card>;
}
