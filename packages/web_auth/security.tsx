"use client";
import {useState} from 'react';
import {authPost} from './client';
export function SecuritySettings({deliveryDeferred=false,workspaceHref='/dashboard'}:{deliveryDeferred?:boolean;workspaceHref?:'/dashboard'|'/customer#profile'|'/business/dashboard'}={}){
 const [password,setPassword]=useState(''),[code,setCode]=useState(''),[phone,setPhone]=useState(''),[backup,setBackup]=useState(''),[setup,setSetup]=useState(''),[codes,setCodes]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function run(action:string){if(busy)return;setBusy(true);setMessage('');try{
  const data=action==='step-up'?await authPost('faji/step-up',{password,code:code||undefined,backupCode:backup||undefined}):action==='enable'?await authPost('two-factor/enable',{password}):action==='verify'?await authPost('two-factor/verify-totp',{code,trustDevice:false}):action==='disable'?await authPost('two-factor/disable',{password}):action==='codes'?await authPost('two-factor/generate-backup-codes',{password}):action==='send-phone'?await authPost('phone-number/send-otp',{phoneNumber:phone}):action==='verify-phone'?await authPost('phone-number/verify',{phoneNumber:phone,code,updatePhoneNumber:true,disableSession:true}):await authPost('faji/unlink-phone',{});
  if(data.totpURI)setSetup(new URL(data.totpURI).searchParams.get('secret')??'');if(data.backupCodes)setCodes(data.backupCodes);
  if(action==='verify'||action==='disable')setSetup('');setMessage('Completed. MFA is optional; verification is required to finish enrollment.');
 }catch(e){setMessage(e instanceof Error?e.message:'Request failed');}finally{setPassword('');setCode('');setBackup('');setBusy(false);}}
 return <main style={{maxWidth:560,margin:'48px auto',padding:24}}><h1>Account security</h1><p>MFA is optional for every role. Reauthenticate before changing a verified phone or removing MFA.</p>
 <p><label>Current password <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label></p>
 <p><label>Authenticator or phone code <input autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)}/></label></p>
 <p><label>MFA recovery code for reauthentication <input autoComplete="off" value={backup} onChange={e=>setBackup(e.target.value)}/></label></p>
 <p><label>Phone number <input disabled={deliveryDeferred} type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label></p>
 <div>{[['step-up','Reauthenticate'],['enable','Enroll authenticator'],['verify','Verify enrollment'],['disable','Disable MFA'],['codes','Replace recovery codes'],['send-phone','Send phone OTP'],['verify-phone','Verify phone'],['unlink','Revoke phone']].map(([id,label])=><button key={id} disabled={busy||(deliveryDeferred&&['send-phone','verify-phone'].includes(id))} onClick={()=>run(id)}>{label}</button>)}</div>
 {setup&&<p>Enter this setup key in your authenticator, then verify enrollment: <code>{setup}</code></p>}
 {codes.length>0&&<div><p>Store these recovery codes offline. Each works once.</p><pre>{codes.join('\n')}</pre><button onClick={()=>setCodes([])}>I saved my codes</button></div>}
 {deliveryDeferred&&<p role="note">Email and SMS delivery are deferred. Phone verification is disabled; authenticator MFA and recovery codes remain available.</p>}
 <p role="status">{message}</p><a href={workspaceHref}>Workspace</a> · <a href={workspaceHref==='/business/dashboard'?'/business/login':'/login'}>Sign in</a></main>;
}
