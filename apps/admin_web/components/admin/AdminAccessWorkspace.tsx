'use client';

import {useCallback,useEffect,useState} from 'react';
import {Check,RefreshCw,ShieldCheck,UserCog,UserPlus} from 'lucide-react';
import {toast} from 'sonner';
import {adminRequest,useAdminCommand} from '../../lib/admin-api';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from '../ui/card';
import {Checkbox} from '../ui/checkbox';
import {Input} from '../ui/input';

const scopes=[
 'operations.read','audit.read','governance.read','governance.write','identity.write',
 'finance.read','finance.write','support.read','support.write','integrations.read',
 'reports.read','monitoring.read','incidents.write','waitlist.read','business_waitlist.read'
] as const;
type Scope=typeof scopes[number];
type AdminRecord={subject:string;email:string;emailVerified:boolean;suspended:boolean;scopes:Scope[]};

export default function AdminAccessWorkspace({managerSubject}:{managerSubject:string|null}){
 const [admins,setAdmins]=useState<AdminRecord[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [email,setEmail]=useState('');
 const [platformAdmin,setPlatformAdmin]=useState(true);
 const [selectedScopes,setSelectedScopes]=useState<Scope[]>([]);
 const [reason,setReason]=useState('');
 const run=useAdminCommand();

 const refresh=useCallback(async()=>{
  setLoading(true);
  setError(null);
  try{setAdmins(await adminRequest<AdminRecord[]>('admin/access/admins'));}
  catch(error){setError(error instanceof Error?error.message:'Unable to load admin access.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);

 function edit(admin:AdminRecord){
  setEmail(admin.email);
  setPlatformAdmin(true);
  setSelectedScopes(admin.scopes);
  setReason('');
 }
 function toggleScope(scope:Scope,checked:boolean){
  setSelectedScopes(current=>checked?[...new Set([...current,scope])]:current.filter(item=>item!==scope));
 }
 async function save(){
  if(!email.trim()||reason.trim().length<8)return;
  if(!platformAdmin&&selectedScopes.length){toast.error('Remove all scopes before revoking Platform Admin status.');return;}
  setBusy(true);
  try{
   const result=await run<{changed:boolean}>('admin/access/grants',{
    email:email.trim(),platformAdmin,scopes:platformAdmin?selectedScopes:[],reason:reason.trim()
   });
   toast.success(result.changed?'Admin access updated.':'Admin access is already up to date.');
   await refresh();
  }catch(error){toast.error(error instanceof Error?error.message:'Admin access could not be updated.');}
  finally{setBusy(false);}
 }

 const allSelected=selectedScopes.length===scopes.length;
 const ownerEntry=admins.find(admin=>admin.subject===managerSubject);
 return <div className="space-y-5">
  <Card>
   <CardHeader>
    <div className="flex items-start gap-3">
     <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><ShieldCheck className="size-5"/></span>
     <div><CardTitle>Admin access management</CardTitle><CardDescription className="mt-1">Only the configured Platform Admin owner can change administrator access. Every change is audited; your own access is protected.</CardDescription></div>
    </div>
   </CardHeader>
   {ownerEntry&&<CardContent className="pt-0"><Badge variant="success"><Check className="size-3"/>Owner account verified</Badge></CardContent>}
  </Card>

  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
   <Card>
    <CardHeader className="flex-row items-center justify-between">
     <div><CardTitle>Platform administrators</CardTitle><CardDescription className="mt-1">Assign least-privilege scopes or select all privileges.</CardDescription></div>
     <Button type="button" variant="outline" size="sm" onClick={()=>void refresh()} disabled={loading}><RefreshCw className="size-3.5"/>Refresh</Button>
    </CardHeader>
    <CardContent className="space-y-3">
     {loading&&<p className="text-sm text-muted-foreground" role="status">Loading administrator accounts…</p>}
     {error&&<div className="rounded-lg border border-destructive/30 bg-accent p-3 text-sm text-accent-foreground" role="alert">{error}</div>}
     {!loading&&!error&&!admins.length&&<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No Platform Admin accounts are currently registered.</p>}
     {admins.map(admin=><div key={admin.subject} className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0">
        <p className="break-all text-sm font-semibold">{admin.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">{admin.suspended?'Suspended or revoked':admin.emailVerified?'Verified account':'Email not verified'} · {admin.scopes.length} of {scopes.length} scopes</p>
       </div>
       <Button type="button" size="sm" variant="outline" disabled={admin.subject===managerSubject||admin.suspended||!admin.emailVerified} onClick={()=>edit(admin)}>
        <UserCog className="size-3.5"/>{admin.subject===managerSubject?'Owner':'Edit access'}
       </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
       {admin.scopes.map(scope=><Badge key={scope} variant="outline" className="max-w-full break-all">{scope}</Badge>)}
       {!admin.scopes.length&&<span className="text-xs text-muted-foreground">No operational scopes assigned</span>}
      </div>
     </div>)}
    </CardContent>
   </Card>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2"><UserPlus className="size-4 text-primary"/>Grant or update access</CardTitle>
     <CardDescription>Use the exact email of an existing, verified, active account. This does not create an account or bypass business approval.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
     <label className="block space-y-1.5 text-sm font-medium">Account email
      <Input type="email" autoComplete="off" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="admin@example.com"/>
     </label>
     <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
      <Checkbox checked={platformAdmin} onChange={event=>{setPlatformAdmin(event.target.checked);if(!event.target.checked)setSelectedScopes([]);}}/>
      <span><span className="block font-medium">Platform Admin access</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Uncheck to revoke this account's Platform Admin role and active scopes.</span></span>
     </label>
     {platformAdmin&&<fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Allowed scopes</legend>
      <label className="flex cursor-pointer items-center gap-2 border-b pb-3 text-sm font-semibold">
       <Checkbox checked={allSelected} onChange={event=>setSelectedScopes(event.target.checked?[...scopes]:[])}/>
       All privileges ({scopes.length} scopes)
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
       {scopes.map(scope=><label key={scope} className="flex min-w-0 cursor-pointer items-center gap-2 text-xs">
        <Checkbox checked={selectedScopes.includes(scope)} onChange={event=>toggleScope(scope,event.target.checked)}/>
        <span className="break-all">{scope}</span>
       </label>)}
      </div>
     </fieldset>}
     <label className="block space-y-1.5 text-sm font-medium">Reason for change
      <Input minLength={8} maxLength={500} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Explain why this access is needed"/>
     </label>
     <Button type="button" className="w-full" disabled={busy||email.trim().length<3||reason.trim().length<8} onClick={()=>void save()}>
      {busy?'Saving access…':platformAdmin?'Save admin access':'Revoke Platform Admin access'}
     </Button>
     <p className="text-xs leading-5 text-muted-foreground">Changes take effect on subsequent API requests. The target must sign in again if their current session does not include the new admin role.</p>
    </CardContent>
   </Card>
  </div>
 </div>;
}
