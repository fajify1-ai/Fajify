"use client";
import {useState,useEffect,type FormEvent} from 'react';
import {authClient,authPost} from './client';
export function AuthForm({mode,initialSecondFactor=false,returnTo='/dashboard'}:{mode:'login'|'register'|'recover'|'reset'|'phone'|'phone-reset';initialSecondFactor?:boolean;returnTo?:'/dashboard'|'/customer'|'/business/dashboard'|'/business/dashboard#onboarding'}){
 const [resetToken,setResetToken]=useState('');
 useEffect(()=>{if(mode==='reset'){const url=new URL(window.location.href);setResetToken(url.searchParams.get('token')??'');url.searchParams.delete('token');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[mode]);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[mfa,setMfa]=useState(initialSecondFactor),[backup,setBackup]=useState(false),[sent,setSent]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setMessage('');
  const values=new FormData(event.currentTarget),email=String(values.get('email')??''),password=String(values.get('password')??''),code=String(values.get('code')??'');
  try{
   const data=mfa?await authPost('two-factor/'+(backup?'verify-backup-code':'verify-totp'),{code,trustDevice:false}):mode==='phone-reset'?await authPost(sent?'phone-number/reset-password':'phone-number/request-password-reset',{phoneNumber:String(values.get('phone')),otp:code,newPassword:password}):mode==='phone'?await authPost(sent?'phone-number/verify':'phone-number/send-otp',{phoneNumber:String(values.get('phone')),code:sent?code:undefined}):mode==='login'?await authPost('sign-in/email',{email,password}):mode==='register'?await authPost('sign-up/email',{email,password,name:String(values.get('name'))}):mode==='recover'?await authPost('request-password-reset',{email,redirectTo:window.location.origin+'/reset-password'}):await authPost('reset-password',{newPassword:password,token:resetToken});
   if(data.twoFactorRedirect){setMfa(true);return;}
   if((mode==='phone'||mode==='phone-reset')&&!sent){setSent(true);setMessage('Enter the verification code sent to your phone.');return;}
   if(mode==='phone-reset'){setMessage('Password updated. Sign in.');return;}
   if(mode==='login'||mode==='register'||mode==='phone')window.location.assign(returnTo);
   else setMessage(mode==='recover'?'If the account exists, a recovery email has been sent.':'Password updated. You can sign in.');
  }catch(error){setMessage(error instanceof Error?error.message:'Authentication unavailable');}finally{setBusy(false);}
 }
 return <main style={{maxWidth:440,margin:'64px auto',padding:24}}><h1>{mfa?'Verify your second factor':mode==='login'?'Sign in':mode==='register'?'Create your Faji account':mode==='recover'?'Recover your account':mode==='phone'?'Phone sign-in':'Choose a new password'}</h1><form onSubmit={submit} method="post" action="/api/auth/unavailable">
 {!mfa&&mode==='register'&&<p><label>Name <input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label></p>}
 {!mfa&&!['reset','phone','phone-reset'].includes(mode)&&<p><label>Email <input name="email" type="email" autoComplete="email" required maxLength={254}/></label></p>}
 {!mfa&&(mode==='phone'||mode==='phone-reset')&&<p><label>Phone number <input name="phone" type="tel" autoComplete="tel" pattern="\+[1-9][0-9]{6,14}" required readOnly={sent}/></label></p>}
 {!mfa&&!['recover','phone'].includes(mode)&&(mode!=='phone-reset'||sent)&&<p><label>Password <input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:12} required maxLength={128}/></label></p>}
 {(mfa||(mode==='phone'||mode==='phone-reset')&&sent)&&<p><label>{backup?'Recovery code':'Verification code'} <input name="code" autoComplete="one-time-code" required maxLength={128}/></label></p>}
 <button disabled={busy} type="submit">{busy?'Please wait…':'Continue'}</button><p role="status">{message}</p></form>
 {mfa&&<button onClick={()=>setBackup(!backup)}>{backup?'Use authenticator':'Use recovery code'}</button>}
 <nav aria-label="Account"><a href="/login">Sign in</a> · <a href="/register">Register</a> · <a href="/recover">Forgot password</a> · <a href="/phone-login">Phone sign-in</a> · <a href="/phone-recovery">Phone recovery</a></nav></main>;
}
export function SignOut(){const [error,setError]=useState('');return <><button onClick={async()=>{try{const result=await authClient.signOut();if(result.error)throw Error();window.location.assign('/login');}catch{setError('Sign out failed. Please retry.');}}}>Sign out</button><p role="status">{error}</p></>;}
