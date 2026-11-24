'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {
 Activity,
 ArrowDownRight,
 ArrowUpRight,
 Building2,
 CheckCircle2,
 ChevronRight,
 Clock3,
 CreditCard,
 ExternalLink,
 FileCheck2,
 LockKeyhole,
 RefreshCw,
 ShieldCheck,
 TriangleAlert
} from 'lucide-react';
import {useForm,type UseFormRegisterReturn} from 'react-hook-form';
import Link from 'next/link';
import {
 Bar,
 BarChart,
 CartesianGrid,
 ResponsiveContainer,
 Tooltip,
 XAxis,
 YAxis
} from 'recharts';
import {toast} from 'sonner';
import {z} from 'zod';
import {AdminShell} from '../../components/admin/AdminShell';
import AdminBackendViews,{AdminOverviewData} from '../../components/admin/AdminBackendViews';
import {DataTable,StatusBadge,type TableColumn} from '../../components/admin/DataTable';
import type {AdminView,Application,ApplicationDetails,Payment} from '../../components/admin/types';
import {Badge} from '../../components/ui/badge';
import {Button} from '../../components/ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '../../components/ui/card';
import {Checkbox} from '../../components/ui/checkbox';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '../../components/ui/dialog';
import {Skeleton} from '../../components/ui/skeleton';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger} from '../../components/ui/dropdown-menu';
import {cn} from '../../lib/cn';

type Page<T>={items:T[];nextOffset:number|null};
type QueueState<T>={items:T[];nextOffset:number|null;loading:boolean;loadingMore:boolean;error:string|null};
type Decision='approved'|'rejected';
type SimulationOutcome='succeeded'|'failed'|'cancelled';
type Acknowledgement={acknowledged:boolean};

const acknowledgementSchema=z.object({
 acknowledged:z.boolean().refine(value=>value,'Please confirm that you have reviewed the request.')
});

async function request<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/platform/'+path,{
  method:body===undefined?'GET':'POST',
  credentials:'same-origin',
  cache:'no-store',
  headers:{'content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 const text=await response.text();
 let result:unknown;
 try{result=text?JSON.parse(text):null;}catch{throw new Error('The administration service returned an invalid response.');}
 if(!response.ok){
  const message=result&&typeof result==='object'&&'message'in result&&typeof result.message==='string'?result.message:`Request failed (${response.status}).`;
  throw new Error(message);
 }
 return result as T;
}

function formatMoney(amountMinor:string,currency:string){
 const amount=Number(amountMinor)/100;
 if(!Number.isFinite(amount))return `${currency} ${amountMinor}`;
 if(!/^[A-Z]{3}$/.test(currency))return `${currency} ${amount.toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 return new Intl.NumberFormat('en-NG',{style:'currency',currency,maximumFractionDigits:2}).format(amount);
}

function formatDate(value:string|null|undefined,options:Intl.DateTimeFormatOptions={dateStyle:'medium'}){
 if(!value)return 'Not provided';
 const date=new Date(value);
 return Number.isNaN(date.valueOf())?'Date unavailable':new Intl.DateTimeFormat('en-GB',options).format(date);
}

function queueValue(count:number,hasMore:boolean){
 return hasMore?`${count}+`:String(count);
}

function LoadingRows(){
 return <div aria-label="Loading queue" className="space-y-3">
  {Array.from({length:5},(_,index)=><div key={index} className="flex items-center gap-4 rounded-lg border bg-card p-4">
   <Skeleton className="size-4 rounded"/>
   <Skeleton className="h-4 w-44"/>
   <Skeleton className="ml-auto h-4 w-24"/>
   <Skeleton className="h-8 w-20"/>
  </div>)}
 </div>;
}

function QueueError({message,onRetry}:{message:string;onRetry:()=>void}){
 return <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-accent/50 p-5 sm:flex-row sm:items-center">
  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><TriangleAlert className="size-5"/></span>
  <div className="min-w-0 flex-1"><p className="text-sm font-semibold">This queue could not be loaded</p><p className="mt-1 break-words text-sm text-muted-foreground">{message}</p></div>
  <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCw className="size-3.5"/>Retry</Button>
 </div>;
}

function MetricCard({label,value,description,icon:Icon,loading,accent=false}:{label:string;value:string;description:string;icon:typeof Building2;loading:boolean;accent?:boolean}){
 return <Card className="min-w-0">
  <CardContent className="p-5">
   <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
     <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
     {loading?<Skeleton className="mt-3 h-8 w-20"/>:<p className="mt-2 text-[30px] font-semibold leading-9 tracking-tight">{value}</p>}
    </div>
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl',accent?'bg-accent text-primary':'bg-muted text-foreground')}><Icon className="size-[18px]"/></span>
   </div>
   <p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p>
  </CardContent>
 </Card>;
}

function QueueChart({applications}:{applications:Application[]}){
 const data=useMemo(()=>{
  const today=new Date();
  const keyOf=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const days=Array.from({length:7},(_,index)=>{
   const day=new Date(today);
   day.setDate(today.getDate()-6+index);
   const key=keyOf(day);
   return {key,label:new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(day),count:0};
  });
  const counts=new Map(days.map(day=>[day.key,day]));
  for(const application of applications){
   const createdAt=new Date(application.createdAt);
   if(Number.isNaN(createdAt.valueOf()))continue;
   const key=keyOf(createdAt);
   const day=counts.get(key);
   if(day)day.count+=1;
  }
  return days;
 },[applications]);
 const hasRecentSubmissions=data.some(day=>day.count>0);

 return <Card className="h-full">
  <CardHeader className="flex-row items-start justify-between gap-4">
   <div><CardTitle>Review queue activity</CardTitle><CardDescription className="mt-1">Business applications in the loaded review queue, by creation date.</CardDescription></div>
   <Badge variant="outline"><Activity className="size-3.5"/>Last 7 days</Badge>
  </CardHeader>
  <CardContent className="pt-1">
   {hasRecentSubmissions?   <div role="img" aria-label="Bar chart showing business applications in the loaded review queue by creation date for the last seven days" className="h-[235px] w-full">
    <ResponsiveContainer width="100%" height="100%">
     <BarChart data={data} margin={{top:8,right:8,left:-24,bottom:0}}>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'var(--muted-foreground)',fontSize:12}} tickMargin={10}/>
      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:'var(--muted-foreground)',fontSize:11}}/>
      <Tooltip cursor={{fill:'var(--muted)'}} contentStyle={{background:'var(--popover)',borderColor:'var(--border)',borderRadius:12,color:'var(--popover-foreground)'}} labelStyle={{color:'var(--popover-foreground)',fontWeight:600}}/>
      <Bar dataKey="count" name="Applications" fill="var(--brand)" radius={[5,5,0,0]} maxBarSize={34}/>
     </BarChart>
    </ResponsiveContainer>
   </div>:<div className="grid h-[235px] place-items-center rounded-lg border border-dashed bg-muted/30 px-5 text-center">
    <div><span className="mx-auto mb-2 grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Activity className="size-4"/></span><p className="text-sm font-medium">No recent applications created in this queue</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">The chart reflects only the business applications returned by the current review queue.</p></div>
   </div>}
  </CardContent>
 </Card>;
}

function DetailValue({value}:{value:unknown}){
 if(value===null||value===undefined||value==='')return <span className="text-muted-foreground">Not provided</span>;
 if(typeof value==='object')return <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/70 p-3 text-xs leading-5">{JSON.stringify(value,null,2)}</pre>;
 return <span className="break-words">{String(value)}</span>;
}

export default function Console(){
 const [activeView,setActiveView]=useState<AdminView>('overview');
 const [applications,setApplications]=useState<QueueState<Application>>({items:[],nextOffset:null,loading:true,loadingMore:false,error:null});
 const [payments,setPayments]=useState<QueueState<Payment>>({items:[],nextOffset:null,loading:true,loadingMore:false,error:null});
 const [selectedApplication,setSelectedApplication]=useState<{row:Application;detail:ApplicationDetails|null;loading:boolean;error:string|null}|null>(null);
 const [reviewAction,setReviewAction]=useState<{application:Application;decision:Decision}|null>(null);
 const [paymentAction,setPaymentAction]=useState<{payment:Payment;outcome:SimulationOutcome}|null>(null);
 const [busy,setBusy]=useState<string|null>(null);
 const decisionForm=useForm<Acknowledgement>({resolver:zodResolver(acknowledgementSchema),defaultValues:{acknowledged:false}});
 const paymentForm=useForm<Acknowledgement>({resolver:zodResolver(acknowledgementSchema),defaultValues:{acknowledged:false}});

 const refreshApplications=useCallback(async()=>{
  setApplications(current=>({...current,loading:true,error:null}));
  try{
   const result=await request<Page<Application>>('admin/governance/approvals?limit=50&offset=0');
   setApplications({items:result.items,nextOffset:result.nextOffset,loading:false,loadingMore:false,error:null});
  }catch(error){
   const message=error instanceof Error?error.message:'Unable to load business applications.';
   setApplications(current=>({...current,loading:false,error:message}));
  }
 },[]);

 const refreshPayments=useCallback(async()=>{
  setPayments(current=>({...current,loading:true,error:null}));
  try{
   const result=await request<Page<Payment>>('admin/finance/simulations?limit=50&offset=0');
   setPayments({items:result.items,nextOffset:result.nextOffset,loading:false,loadingMore:false,error:null});
  }catch(error){
   const message=error instanceof Error?error.message:'Unable to load simulated payments.';
   setPayments(current=>({...current,loading:false,error:message}));
  }
 },[]);

 useEffect(()=>{void refreshApplications();void refreshPayments();},[refreshApplications,refreshPayments]);

 async function loadMoreApplications(){
  const offset=applications.nextOffset;
  if(offset===null||applications.loadingMore)return;
  setApplications(current=>({...current,loadingMore:true,error:null}));
  try{
   const result=await request<Page<Application>>(`admin/governance/approvals?limit=50&offset=${offset}`);
   setApplications(current=>({items:appendUnique(current.items,result.items),nextOffset:result.nextOffset,loading:false,loadingMore:false,error:null}));
  }catch(error){
   setApplications(current=>({...current,loadingMore:false,error:error instanceof Error?error.message:'Unable to load more applications.'}));
  }
 }

 async function loadMorePayments(){
  const offset=payments.nextOffset;
  if(offset===null||payments.loadingMore)return;
  setPayments(current=>({...current,loadingMore:true,error:null}));
  try{
   const result=await request<Page<Payment>>(`admin/finance/simulations?limit=50&offset=${offset}`);
   setPayments(current=>({items:appendUnique(current.items,result.items),nextOffset:result.nextOffset,loading:false,loadingMore:false,error:null}));
  }catch(error){
   setPayments(current=>({...current,loadingMore:false,error:error instanceof Error?error.message:'Unable to load more payment simulations.'}));
  }
 }

 async function inspect(application:Application){
  setSelectedApplication({row:application,detail:null,loading:true,error:null});
  try{
   const detail=await request<ApplicationDetails>(`admin/governance/approvals/${application.id}`);
   setSelectedApplication(current=>current?.row.id===application.id?{row:application,detail,loading:false,error:null}:current);
  }catch(error){
   setSelectedApplication(current=>current?.row.id===application.id?{...current,loading:false,error:error instanceof Error?error.message:'Unable to inspect this application.'}:current);
  }
 }

 function openReview(application:Application,decision:Decision){
  setReviewAction({application,decision});
  decisionForm.reset({acknowledged:false});
 }

 async function submitReview(values:Acknowledgement){
  if(!reviewAction||!values.acknowledged)return;
  const {application,decision}=reviewAction;
  setBusy(application.id);
  try{
   await request(`business/onboarding/${application.id}/review`,{decision});
   toast.success(decision==='approved'?'Business application approved.':'Business application rejected.');
   setReviewAction(null);
   setSelectedApplication(null);
   await refreshApplications();
  }catch(error){
   toast.error(error instanceof Error?error.message:'Unable to record the application decision.');
  }finally{
   setBusy(null);
  }
 }

 function openPaymentAction(payment:Payment,outcome:SimulationOutcome){
  setPaymentAction({payment,outcome});
  paymentForm.reset({acknowledged:false});
 }

 async function submitPaymentAction(values:Acknowledgement){
  if(!paymentAction||!values.acknowledged)return;
  const {payment,outcome}=paymentAction;
  setBusy(payment.id);
  try{
   await request(`admin/finance/payments/${payment.id}/simulation`,{outcome});
   toast.success(`Simulation outcome recorded: ${outcome}. No money moved.`);
   setPaymentAction(null);
   await refreshPayments();
  }catch(error){
   toast.error(error instanceof Error?error.message:'Unable to record the simulated outcome.');
  }finally{
   setBusy(null);
  }
 }

 const applicationColumns=useMemo<TableColumn<Application>[]>(()=>[
  {id:'business',header:'Business',sortValue:row=>row.displayName,exportValue:row=>row.displayName,cell:row=><div className="flex min-w-0 items-center gap-3">
   <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Building2 className="size-4"/></span>
   <span className="min-w-0"><span className="block truncate font-medium">{row.displayName}</span><span className="mt-0.5 block max-w-48 truncate font-mono text-[10px] text-muted-foreground">{row.id}</span></span>
  </div>},
  {id:'created',header:'Created',sortValue:row=>new Date(row.createdAt).getTime(),exportValue:row=>row.createdAt,cell:row=><span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.createdAt,{dateStyle:'medium',timeStyle:'short'})}</span>},
  {id:'status',header:'Status',sortValue:row=>row.status,exportValue:row=>row.status,cell:row=><StatusBadge status={row.status}/>}
 ],[]);
 const paymentColumns=useMemo<TableColumn<Payment>[]>(()=>[
  {id:'payment',header:'Payment simulation',sortValue:row=>row.id,exportValue:row=>row.id,cell:row=><div className="flex min-w-0 items-center gap-3">
   <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground"><CreditCard className="size-4"/></span>
   <span className="min-w-0"><span className="block font-medium">{formatMoney(row.amountMinor,row.currency)}</span><span className="mt-0.5 block max-w-48 truncate font-mono text-[10px] text-muted-foreground">{row.id}</span></span>
  </div>},
  {id:'created',header:'Created',sortValue:row=>new Date(row.createdAt).getTime(),exportValue:row=>row.createdAt,cell:row=><span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.createdAt,{dateStyle:'medium',timeStyle:'short'})}</span>},
  {id:'status',header:'Status',exportValue:()=>'pending simulation',cell:()=><Badge variant="warning"><Clock3 className="size-3.5"/>Pending simulation</Badge>}
 ],[]);

 const searchApplications=useMemo(()=>applications.items.slice(0,50),[applications.items]);
 const activitySummary=applications.items.length+payments.items.length;

 return <AdminShell activeView={activeView} onNavigate={setActiveView} applications={searchApplications} applicationsMore={applications.nextOffset!==null} payments={payments.items} paymentsMore={payments.nextOffset!==null} onInspectApplication={inspect}>
  {activeView==='overview'&&<div className="space-y-5">
   <section aria-label="Operational metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
    <MetricCard label="Business approvals" value={applications.error?'—':queueValue(applications.items.length,applications.nextOffset!==null)} description={applications.error?'The review queue is unavailable. Retry to load current records.':applications.nextOffset!==null?'Pending items loaded from the review queue.':'Applications currently returned by the review queue.'} icon={Building2} loading={applications.loading}/>
    <MetricCard label="Payment simulations" value={payments.error?'—':queueValue(payments.items.length,payments.nextOffset!==null)} description={payments.error?'The simulation queue is unavailable. Retry to load current records.':'Pending test outcomes only. This queue never represents live money movement.'} icon={CreditCard} loading={payments.loading} accent/>
    <Card className="sm:col-span-2 2xl:col-span-1">
     <CardContent className="flex h-full min-h-[140px] items-center gap-4 p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success text-success-foreground"><ShieldCheck className="size-5"/></span>
      <div className="min-w-0"><p className="text-sm font-semibold">Protected admin session</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Platform access is verified on the server. Privileged API actions retain their authorization checks.</p><Link href="/account-security" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Review account security<ExternalLink className="size-3"/></Link></div>
     </CardContent>
    </Card>
   </section>

   <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
    <div className="xl:col-span-8">
     {applications.loading?<Card className="p-5"><Skeleton className="h-5 w-52"/><Skeleton className="mt-4 h-[235px] w-full"/></Card>:applications.error?<QueueError message={applications.error} onRetry={()=>void refreshApplications()}/>:<QueueChart applications={applications.items}/>}
    </div>
    <Card className="xl:col-span-4">
     <CardHeader><CardTitle>Admin activity queues</CardTitle><CardDescription>Live records available to this console.</CardDescription></CardHeader>
     <CardContent className="space-y-3">
      <QueueLink icon={Building2} label="Business applications" detail={`${applications.items.length}${applications.nextOffset!==null?'+':''} loaded for review`} loading={applications.loading} error={!!applications.error} onClick={()=>setActiveView('applications')}/>
      <QueueLink icon={CreditCard} label="Payment simulations" detail={`${payments.items.length}${payments.nextOffset!==null?'+':''} pending test outcomes`} loading={payments.loading} error={!!payments.error} onClick={()=>setActiveView('payments')}/>
      <p className="pt-1 text-xs leading-5 text-muted-foreground">Counts reflect the records loaded from the approved admin endpoints; no estimates or demo data are included.</p>
     </CardContent>
    </Card>
   </section>

   <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    <QueuePreview title="Business approvals" description="Most recently returned applications." icon={Building2} loading={applications.loading} error={applications.error} rows={applications.items.slice(0,5).map(row=>({id:row.id,title:row.displayName,detail:formatDate(row.createdAt,{dateStyle:'medium'}),status:row.status}))} emptyTitle="No applications are awaiting review" onViewAll={()=>setActiveView('applications')} onOpen={id=>{const row=applications.items.find(item=>item.id===id);if(row)void inspect(row);}}/>
    <QueuePreview title="Payment simulations" description="Pending simulated payment outcomes." icon={CreditCard} loading={payments.loading} error={payments.error} rows={payments.items.slice(0,5).map(row=>({id:row.id,title:formatMoney(row.amountMinor,row.currency),detail:formatDate(row.createdAt,{dateStyle:'medium'}),status:'pending'}))} emptyTitle="No payment simulations are pending" onViewAll={()=>setActiveView('payments')} onOpen={()=>setActiveView('payments')}/>
   </section>
   <AdminOverviewData/>
   <p className="sr-only" aria-live="polite">{activitySummary} operational records loaded.</p>
  </div>}

  {activeView==='applications'&&<QueueSection title="Business application queue" description="Applications returned by the platform review endpoint. Decisions are recorded individually and require explicit confirmation." loading={applications.loading} error={applications.error} onRetry={()=>void refreshApplications()} onLoadMore={loadMoreApplications} loadingMore={applications.loadingMore} hasMore={applications.nextOffset!==null} loadedCount={applications.items.length}>
   <DataTable rows={applications.items} columns={applicationColumns} rowKey={row=>row.id} searchText={row=>`${row.displayName} ${row.id} ${row.status}`} emptyTitle="No business applications awaiting review" emptyDescription="New submissions will appear here when the governance service returns them." filter={{label:'Filter by status',options:[...new Set(applications.items.map(row=>row.status))].map(status=>({label:capitalize(status),value:status})),getValue:row=>row.status}} actions={row=><Button type="button" size="sm" variant="outline" onClick={()=>void inspect(row)}>Review<ChevronRight className="size-3.5"/></Button>}/>
  </QueueSection>}

  {activeView==='payments'&&<QueueSection title="Pending payment simulations" description="Synthetic outcomes are for acceptance and testing only. No provider is contacted and no real money moves." loading={payments.loading} error={payments.error} onRetry={()=>void refreshPayments()} onLoadMore={loadMorePayments} loadingMore={payments.loadingMore} hasMore={payments.nextOffset!==null} loadedCount={payments.items.length}>
   <div className="mb-4 flex gap-3 rounded-xl border border-warning-foreground/15 bg-warning p-4 text-sm text-warning-foreground">
    <TriangleAlert className="mt-0.5 size-4 shrink-0"/>
    <p><strong className="font-semibold">Simulation-only controls.</strong> Recording an outcome changes a test payment record and does not contact a payment provider.</p>
   </div>
   <DataTable rows={payments.items} columns={paymentColumns} rowKey={row=>row.id} searchText={row=>`${row.id} ${row.amountMinor} ${row.currency} ${row.createdAt}`} emptyTitle="No pending payment simulations" emptyDescription="The finance simulation endpoint currently has no pending test outcomes." filter={{label:'Filter by status',options:[{label:'Pending simulation',value:'pending'}],getValue:()=> 'pending'}} actions={payment=><PaymentActions onChoose={outcome=>openPaymentAction(payment,outcome)}/>}/>
  </QueueSection>}

  {isBackendView(activeView)&&<AdminBackendViews view={activeView}/>}
  {activeView==='settings'&&<ComingSoon onBack={()=>setActiveView('overview')}/>}

  <Dialog open={selectedApplication!==null} onOpenChange={open=>{if(!open)setSelectedApplication(null);}}>
   <DialogContent className="max-w-2xl">
    <DialogHeader>
     <div className="mb-1 flex items-center gap-2"><Badge variant="outline"><FileCheck2 className="size-3.5"/>Governance review</Badge>{selectedApplication?.detail&&<StatusBadge status={selectedApplication.detail.status}/>}</div>
     <DialogTitle>{selectedApplication?.detail?.displayName??selectedApplication?.row.displayName??'Business application'}</DialogTitle>
     <DialogDescription>Review the submitted information before recording a decision.</DialogDescription>
    </DialogHeader>
    {selectedApplication?.loading?<div className="mt-5 space-y-3"><Skeleton className="h-5 w-48"/><Skeleton className="h-24 w-full"/><Skeleton className="h-24 w-full"/></div>:selectedApplication?.error?<div role="alert" className="mt-5"><QueueError message={selectedApplication.error} onRetry={()=>void inspect(selectedApplication.row)}/></div>:selectedApplication?.detail&&<div className="mt-5 space-y-5">
     <div className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
      <DetailField label="Submitted" value={formatDate(selectedApplication.detail.submittedAt??selectedApplication.detail.createdAt,{dateStyle:'long',timeStyle:'short'})}/>
      <DetailField label="Application ID" value={selectedApplication.detail.id} mono/>
      <DetailField label="Review status" value={capitalize(selectedApplication.detail.status)}/>
     </div>
     <section>
      <h3 className="mb-3 text-sm font-semibold">Submitted application details</h3>
      {selectedApplication.detail.application?Object.entries(selectedApplication.detail.application).length?
       <dl className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2">
        {Object.entries(selectedApplication.detail.application).map(([key,value])=><div key={key} className="min-w-0 space-y-1.5">
         <dt className="text-xs font-medium capitalize text-muted-foreground">{humanize(key)}</dt>
         <dd className="m-0 text-sm"><DetailValue value={value}/></dd>
        </div>)}
       </dl>:<EmptyDetails/>:<EmptyDetails/>}
     </section>
     {selectedApplication.detail.status==='pending'&&<div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={()=>openReview(selectedApplication.row,'rejected')}>Reject application</Button>
      <Button type="button" onClick={()=>openReview(selectedApplication.row,'approved')}><CheckCircle2 className="size-4"/>Approve business</Button>
     </div>}
    </div>}
   </DialogContent>
  </Dialog>

  <Dialog open={reviewAction!==null} onOpenChange={open=>{if(!open&&!busy){setReviewAction(null);decisionForm.reset({acknowledged:false});}}}>
   <DialogContent>
    <DialogHeader>
     <div className={cn('mb-1 grid size-10 place-items-center rounded-xl',reviewAction?.decision==='approved'?'bg-success text-success-foreground':'bg-accent text-accent-foreground')}>{reviewAction?.decision==='approved'?<CheckCircle2 className="size-5"/>:<TriangleAlert className="size-5"/>}</div>
     <DialogTitle>{reviewAction?.decision==='approved'?'Approve this business?':'Reject this application?'}</DialogTitle>
     <DialogDescription>{reviewAction?.application.displayName} will be recorded as {reviewAction?.decision}. The API retains its existing platform-admin authorization and review safeguards.</DialogDescription>
    </DialogHeader>
    <form className="mt-5 space-y-5" onSubmit={decisionForm.handleSubmit(submitReview)}>
     <AcknowledgementControl register={decisionForm.register('acknowledged')} error={decisionForm.formState.errors.acknowledged?.message} text="I have reviewed the submitted application and confirm this decision."/>
     <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" disabled={!!busy} onClick={()=>setReviewAction(null)}>Cancel</Button>
      <Button type="submit" variant={reviewAction?.decision==='approved'?'default':'destructive'} disabled={!!busy}>{busy?'Recording decision…':reviewAction?.decision==='approved'?'Confirm approval':'Confirm rejection'}</Button>
     </div>
    </form>
   </DialogContent>
  </Dialog>

  <Dialog open={paymentAction!==null} onOpenChange={open=>{if(!open&&!busy){setPaymentAction(null);paymentForm.reset({acknowledged:false});}}}>
   <DialogContent>
    <DialogHeader>
     <div className="mb-1 grid size-10 place-items-center rounded-xl bg-warning text-warning-foreground"><CreditCard className="size-5"/></div>
     <DialogTitle>Record simulated outcome</DialogTitle>
     <DialogDescription>Set <strong>{paymentAction?.outcome}</strong> for {paymentAction?formatMoney(paymentAction.payment.amountMinor,paymentAction.payment.currency):'this payment'}.</DialogDescription>
    </DialogHeader>
    <div className="mt-4 rounded-lg border border-warning-foreground/20 bg-warning p-3 text-sm leading-5 text-warning-foreground">This is a test-only record. No payment provider will be contacted and no money will move.</div>
    <form className="mt-5 space-y-5" onSubmit={paymentForm.handleSubmit(submitPaymentAction)}>
     <AcknowledgementControl register={paymentForm.register('acknowledged')} error={paymentForm.formState.errors.acknowledged?.message} text="I understand this records a simulated result only."/>
     <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" disabled={!!busy} onClick={()=>setPaymentAction(null)}>Cancel</Button>
      <Button type="submit" disabled={!!busy}>{busy?'Recording outcome…':'Confirm simulation'}</Button>
     </div>
    </form>
   </DialogContent>
  </Dialog>
 </AdminShell>;
}

function appendUnique<T extends {id:string}>(current:T[],incoming:T[]){
 const known=new Set(current.map(item=>item.id));
 return [...current,...incoming.filter(item=>!known.has(item.id))];
}

function capitalize(value:string){
 return value.length?value[0].toLocaleUpperCase()+value.slice(1).replaceAll('_',' '):value;
}

function humanize(value:string){
 return value.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replaceAll('_',' ').replace(/^\w/,character=>character.toLocaleUpperCase());
}

function QueueLink({icon:Icon,label,detail,loading,error,onClick}:{icon:typeof Building2;label:string;detail:string;loading:boolean;error:boolean;onClick:()=>void}){
 return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50">
  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground"><Icon className="size-4"/></span>
  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{loading?'Loading current queue…':error?'Queue data unavailable':detail}</span></span>
  <ChevronRight className="size-4 shrink-0 text-muted-foreground"/>
 </button>;
}

function QueuePreview({title,description,icon:Icon,loading,error,rows,emptyTitle,onViewAll,onOpen}:{
 title:string;description:string;icon:typeof Building2;loading:boolean;error:string|null;
 rows:{id:string;title:string;detail:string;status:string}[];emptyTitle:string;
 onViewAll:()=>void;onOpen:(id:string)=>void;
}){
 return <Card>
  <CardHeader className="flex-row items-start justify-between gap-3">
   <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><Icon className="size-4"/></span><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div>
   <Button type="button" variant="ghost" size="sm" onClick={onViewAll}>View queue<ChevronRight className="size-3.5"/></Button>
  </CardHeader>
  <CardContent>
   {loading?<div className="space-y-3">{Array.from({length:3},(_,index)=><div key={index} className="flex items-center gap-3"><Skeleton className="size-8"/><Skeleton className="h-4 flex-1"/><Skeleton className="h-4 w-16"/></div>)}</div>
   :error?<div role="alert" className="rounded-lg border border-destructive/30 bg-accent/40 p-3 text-sm text-accent-foreground">{error}</div>
   :!rows.length?<div className="grid min-h-32 place-items-center rounded-lg border border-dashed bg-muted/20 p-5 text-center"><div><p className="text-sm font-medium">{emptyTitle}</p><p className="mt-1 text-xs text-muted-foreground">This view uses live records only.</p></div></div>
   :<div className="divide-y">
    {rows.map(row=><button type="button" key={row.id} onClick={()=>onOpen(row.id)} className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0">
     <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4"/></span>
     <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{row.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{row.detail}</span></span>
     <StatusBadge status={row.status}/>
    </button>)}
   </div>}
  </CardContent>
 </Card>;
}

function QueueSection({title,description,loading,error,onRetry,children,onLoadMore,loadingMore,hasMore,loadedCount}:{
 title:string;description:string;loading:boolean;error:string|null;onRetry:()=>void;children:React.ReactNode;
 onLoadMore:()=>void;loadingMore:boolean;hasMore:boolean;loadedCount:number;
}){
 return <Card>
  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
   <div><CardTitle>{title}</CardTitle><CardDescription className="mt-1 max-w-3xl">{description}</CardDescription></div>
   <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={loading}><RefreshCw className={cn('size-3.5',loading&&'animate-spin')}/>Refresh</Button>
  </CardHeader>
  <CardContent>
   {loading&&!loadedCount?<LoadingRows/>:error&&!loadedCount?<QueueError message={error} onRetry={onRetry}/>:<>
     {error&&<div className="mb-4"><QueueError message={error} onRetry={onRetry}/></div>}
     {children}
     {hasMore&&<div className="mt-5 flex flex-col items-center gap-2 border-t pt-4">
     <p className="text-xs text-muted-foreground">{loadedCount} records loaded. Additional records are available.</p>
     <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={onLoadMore}>{loadingMore?'Loading…':'Load more records'}<ChevronRight className="size-3.5"/></Button>
    </div>}
   </>}
  </CardContent>
 </Card>;
}

function AcknowledgementControl({register,error,text}:{
 register:UseFormRegisterReturn<'acknowledged'>;
 error?:string;text:string;
}){
 return <div>
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-5">
   <Checkbox {...register} aria-invalid={!!error} className="mt-0.5"/>
   <span>{text}</span>
  </label>
  {error&&<p role="alert" className="mt-2 text-xs font-medium text-destructive">{error}</p>}
 </div>;
}

function DetailField({label,value,mono=false}:{label:string;value:string;mono?:boolean}){
 return <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn('mt-1 break-words text-sm font-medium',mono&&'font-mono text-xs')}>{value}</p></div>;
}

function EmptyDetails(){
 return <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center">
  <LockKeyhole className="mx-auto size-5 text-muted-foreground"/>
  <p className="mt-2 text-sm font-medium">No application snapshot is available</p>
  <p className="mt-1 text-xs text-muted-foreground">The API did not return a complete submitted application for this record.</p>
 </div>;
}

function PaymentActions({onChoose}:{onChoose:(outcome:SimulationOutcome)=>void}){
 return <DropdownMenu>
  <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm">Record outcome<ChevronRight className="size-3.5"/></Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
   <DropdownMenuLabel>Simulation only</DropdownMenuLabel>
   <DropdownMenuSeparator/>
   <DropdownMenuItem onSelect={()=>onChoose('succeeded')}><CheckCircle2 className="size-4 text-success-foreground"/>Record success</DropdownMenuItem>
   <DropdownMenuItem onSelect={()=>onChoose('failed')}><ArrowDownRight className="size-4 text-destructive"/>Record failure</DropdownMenuItem>
   <DropdownMenuItem onSelect={()=>onChoose('cancelled')}><ArrowUpRight className="size-4 text-muted-foreground"/>Cancel simulation</DropdownMenuItem>
  </DropdownMenuContent>
 </DropdownMenu>;
}

function ComingSoon({onBack}:{onBack:()=>void}){
 return <Card className="mx-auto max-w-3xl border-dashed">
  <CardContent className="grid min-h-[360px] place-items-center p-8 text-center">
   <div className="max-w-lg">
    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary"><ShieldCheck className="size-6"/></span>
    <Badge variant="outline" className="mt-5">Backend not connected</Badge>
    <h2 className="mt-3 text-xl font-semibold">Platform settings</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Global settings do not have a connected administration API yet. This view will remain unavailable until scoped and audited backend workflows are implemented.</p>
    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
     <Button type="button" variant="outline" onClick={onBack}>Back to overview</Button>
     <Link href="/account-security" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-95">Open account security<ExternalLink className="size-4"/></Link>
    </div>
   </div>
  </CardContent>
 </Card>;
}

function isBackendView(view:AdminView):view is Exclude<AdminView,'overview'|'applications'|'payments'|'settings'>{
 return !['overview','applications','payments','settings'].includes(view);
}
