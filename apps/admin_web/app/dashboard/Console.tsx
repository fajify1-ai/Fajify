'use client';
import {useCallback,useEffect,useState} from 'react';

type Application={id:string;displayName:string;status:string;createdAt:string};
type ApplicationDetails=Application & {application:Record<string,unknown>|null;submittedAt:string|null};
type Payment={id:string;amountMinor:string;currency:string;createdAt:string};
type Page<T>={items:T[];nextOffset:number|null};
type PanelError={governance?:string;payments?:string};

async function request<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/platform/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json();
 if(!response.ok)throw Error(result?.message??`Request failed (${response.status}).`);
 return result as T;
}

function money(amount:string,currency:string){return new Intl.NumberFormat('en-NG',{style:'currency',currency}).format(Number(amount)/100);}

export default function Console(){
 const [applications,setApplications]=useState<Application[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [selected,setSelected]=useState<ApplicationDetails|null>(null);
 const [errors,setErrors]=useState<PanelError>({});
 const [busy,setBusy]=useState('');
 const refreshGovernance=useCallback(async()=>{try{const result=await request<Page<Application>>('admin/governance/approvals?limit=50&offset=0');setApplications(result.items);setErrors(value=>({...value,governance:undefined}));}catch(error){setErrors(value=>({...value,governance:error instanceof Error?error.message:'Unable to load business applications.'}));}},[]);
 const refreshPayments=useCallback(async()=>{try{const result=await request<Page<Payment>>('admin/finance/simulations?limit=50&offset=0');setPayments(result.items);setErrors(value=>({...value,payments:undefined}));}catch(error){setErrors(value=>({...value,payments:error instanceof Error?error.message:'Unable to load simulated payments.'}));}},[]);
 useEffect(()=>{void refreshGovernance();void refreshPayments();},[refreshGovernance,refreshPayments]);

 async function inspect(application:Application){
  setBusy(application.id);setSelected(null);
  try{setSelected(await request<ApplicationDetails>(`admin/governance/approvals/${application.id}`));}
  catch(error){setErrors(value=>({...value,governance:error instanceof Error?error.message:'Unable to inspect application.'}));}
  finally{setBusy('');}
 }
 async function review(application:Application,decision:'approved'|'rejected'){
  const action=decision==='approved'?'approve':'reject';
  if(!window.confirm(`Are you sure you want to ${action} ${application.displayName}'s business application?`))return;
  setBusy(application.id);
  try{
   await request(`business/onboarding/${application.id}/review`,{decision});
   setSelected(null);await refreshGovernance();
  }catch(error){setErrors(value=>({...value,governance:error instanceof Error?error.message:'Unable to review application.'}));}
  finally{setBusy('');}
 }
 async function settle(payment:Payment,outcome:'succeeded'|'failed'|'cancelled'){
  if(!window.confirm(`Record ${outcome} as the simulated outcome for payment ${payment.id}? No money will move.`))return;
  setBusy(payment.id);
  try{await request(`admin/finance/payments/${payment.id}/simulation`,{outcome});await refreshPayments();}
  catch(error){setErrors(value=>({...value,payments:error instanceof Error?error.message:'Unable to record simulated outcome.'}));}
  finally{setBusy('');}
 }
 const section={border:'1px solid #d6dbe4',borderRadius:12,padding:20,margin:'20px 0',background:'white'} as const;
 const button={padding:'9px 13px',border:'1px solid #334155',borderRadius:8,background:'white',cursor:'pointer',marginRight:8,marginTop:8} as const;
 return <main style={{maxWidth:1000,margin:'32px auto',padding:'0 18px',fontFamily:'system-ui,sans-serif',color:'#172033'}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
   <div><h1 style={{marginBottom:4}}>Fajify Admin</h1><p style={{marginTop:0,color:'#526078'}}>Restricted operations console</p></div>
   <a href="/account-security">Account security</a>
  </header>
  <section style={{...section,borderColor:'#d97706',background:'#fffbeb'}}>
   <strong>Simulation safeguards</strong>
   <p style={{marginBottom:0}}>Payment controls record synthetic outcomes only. They are available only when the API is configured with <code>FAJI_PAYMENT_MODE=simulated</code>. No provider is contacted and no money moves.</p>
  </section>
  <section style={section}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2>Business applications awaiting review</h2><button style={button} onClick={()=>void refreshGovernance()}>Refresh</button></div>
   {errors.governance&&<p role="alert">{errors.governance}</p>}
   {!errors.governance&&!applications.length&&<p>No pending applications.</p>}
   {applications.map(application=><article key={application.id} style={{borderTop:'1px solid #e6e9ef',padding:'14px 0'}}>
    <h3 style={{margin:'0 0 5px'}}>{application.displayName}</h3>
    <p style={{margin:'0 0 6px'}}>Submitted {new Date(application.createdAt).toLocaleString()} · Pending</p>
    <small>Application ID: {application.id}</small><br/>
    <button style={button} disabled={!!busy} onClick={()=>void inspect(application)}>{busy===application.id?'Loading…':'Review details'}</button>
    {selected?.id===application.id&&<div style={{padding:12,background:'#f7f8fa',borderRadius:8,overflowWrap:'anywhere'}}>
     <p>Application submission: {selected.submittedAt?new Date(selected.submittedAt).toLocaleString():'No complete submission snapshot'}</p>
     <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit'}}>{JSON.stringify(selected.application??{businessName:selected.displayName},null,2)}</pre>
     <button style={button} disabled={!!busy} onClick={()=>void review(application,'approved')}>Approve business</button>
     <button style={button} disabled={!!busy} onClick={()=>void review(application,'rejected')}>Reject application</button>
    </div>}
   </article>)}
  </section>
  <section style={section}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><h2>Pending simulated payments</h2><button style={button} onClick={()=>void refreshPayments()}>Refresh</button></div>
   {errors.payments&&<p role="alert">{errors.payments}</p>}
   {!errors.payments&&!payments.length&&<p>No pending simulated payments.</p>}
   {payments.map(payment=><article key={payment.id} style={{borderTop:'1px solid #e6e9ef',padding:'14px 0'}}>
    <h3 style={{margin:'0 0 5px'}}>{money(payment.amountMinor,payment.currency)}</h3>
    <p style={{margin:'0 0 6px'}}>Pending simulation · Created {new Date(payment.createdAt).toLocaleString()}</p>
    <small>Payment intent: {payment.id}</small><br/>
    <button style={button} disabled={!!busy} onClick={()=>void settle(payment,'succeeded')}>Record simulated success</button>
    <button style={button} disabled={!!busy} onClick={()=>void settle(payment,'failed')}>Record simulated failure</button>
    <button style={button} disabled={!!busy} onClick={()=>void settle(payment,'cancelled')}>Cancel simulation</button>
   </article>)}
  </section>
 </main>;
}
