"use client";
import {useState,useEffect,type FormEvent} from 'react';
import {authClient,authPost} from './client';
import {passwordsMatch} from './password';
export function AuthForm({mode,initialSecondFactor=false,returnTo='/dashboard'}:{mode:'login'|'register'|'recover'|'reset'|'phone'|'phone-reset';initialSecondFactor?:boolean;returnTo?:'/dashboard'|'/customer'|'/customer#home'|`/customer#inviteFriends/${string}`|'/business/dashboard'|'/business/dashboard#onboarding'}){
 const [resetToken,setResetToken]=useState('');
 const [termsAccepted,setTermsAccepted]=useState(false);
 const [email,setEmail]=useState('');
 useEffect(()=>{if(mode==='reset'){const url=new URL(window.location.href);setResetToken(url.searchParams.get('token')??'');url.searchParams.delete('token');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[mode]);
 const [busy,setBusy]=useState(false),[verificationBusy,setVerificationBusy]=useState(false),[registrationComplete,setRegistrationComplete]=useState(false),[message,setMessage]=useState(''),[mfa,setMfa]=useState(initialSecondFactor),[backup,setBackup]=useState(false),[sent,setSent]=useState(false);
 async function resendVerification(){
  if(verificationBusy)return;
  setVerificationBusy(true);setMessage('');
  try{
   await authPost('send-verification-email',{email:email.trim(),callbackURL:window.location.origin});
   setMessage('If this account needs verification, a verification email has been sent.');
  }catch{
   setMessage('A verification email could not be sent right now. Please try again later.');
  }finally{setVerificationBusy(false);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(mode==='register'){
   const values=new FormData(event.currentTarget);
   if(!passwordsMatch(String(values.get('password')??''),String(values.get('confirmPassword')??''))){setMessage('Passwords do not match.');return;}
  }
  setBusy(true);setMessage('');
  const values=new FormData(event.currentTarget),submittedEmail=String(values.get('email')??'').trim(),password=String(values.get('password')??''),code=String(values.get('code')??'');
  try{
   const data=mfa?await authPost('two-factor/'+(backup?'verify-backup-code':'verify-totp'),{code,trustDevice:false}):mode==='phone-reset'?await authPost(sent?'phone-number/reset-password':'phone-number/request-password-reset',{phoneNumber:String(values.get('phone')),otp:code,newPassword:password}):mode==='phone'?await authPost(sent?'phone-number/verify':'phone-number/send-otp',{phoneNumber:String(values.get('phone')),code:sent?code:undefined}):mode==='login'?await authPost('sign-in/email',{email:submittedEmail,password}):mode==='register'?await authPost('sign-up/email',{email:submittedEmail,password,name:String(values.get('name')),termsAccepted,callbackURL:window.location.origin}):mode==='recover'?await authPost('request-password-reset',{email:submittedEmail,redirectTo:window.location.origin+'/reset-password'}):await authPost('reset-password',{newPassword:password,token:resetToken});
   if(data.twoFactorRedirect){setMfa(true);return;}
   if((mode==='phone'||mode==='phone-reset')&&!sent){setSent(true);setMessage('Enter the verification code sent to your phone.');return;}
   if(mode==='phone-reset'){setMessage('Password updated. Sign in.');return;}
   if(mode==='register'){setEmail(submittedEmail);setRegistrationComplete(true);return;}
   if(mode==='login'||mode==='phone')window.location.assign(returnTo);
   else setMessage(mode==='recover'?'If the account exists, a recovery email has been sent.':'Password updated. You can sign in.');
  }catch(error){setMessage(error instanceof Error?error.message:'Authentication unavailable');}finally{setBusy(false);}
 }
 return <main style={{maxWidth:440,margin:'64px auto',padding:24}}><h1>{mfa?'Verify your second factor':mode==='login'?'Sign in':mode==='register'?'Create your Faji account':mode==='recover'?'Recover your account':mode==='phone'?'Phone sign-in':'Choose a new password'}</h1>{!registrationComplete&&<form onSubmit={submit} method="post" action="/api/auth/unavailable">
 {!mfa&&mode==='register'&&<p><label>Name <input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label></p>}
 {!mfa&&mode==='register'&&<p><label><input type="checkbox" required checked={termsAccepted} onChange={event=>setTermsAccepted(event.target.checked)}/> I agree to the Fajify Terms &amp; Conditions and Privacy Policy.</label></p>}
 {!mfa&&!['reset','phone','phone-reset'].includes(mode)&&<p><label>Email <input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label></p>}
 {!mfa&&(mode==='phone'||mode==='phone-reset')&&<p><label>Phone number <input name="phone" type="tel" autoComplete="tel" pattern="\+[1-9][0-9]{6,14}" required readOnly={sent}/></label></p>}
 {!mfa&&!['recover','phone'].includes(mode)&&(mode!=='phone-reset'||sent)&&<p><label>Password <input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:12} required maxLength={128}/></label></p>}
 {!mfa&&mode==='register'&&<p><label>Confirm password <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required maxLength={128}/></label></p>}
 {(mfa||(mode==='phone'||mode==='phone-reset')&&sent)&&<p><label>{backup?'Recovery code':'Verification code'} <input name="code" autoComplete="one-time-code" required maxLength={128}/></label></p>}
 <button disabled={busy} type="submit">{busy?'Please wait…':'Continue'}</button><p role="status">{message}</p></form>}
 {registrationComplete&&<section aria-labelledby="registration-complete"><h2 id="registration-complete">Account created</h2><p>We attempted to send a verification link to {email}. Check your inbox and spam folder to verify your address. You can continue to your workspace now; verified email is required for certain account privileges.</p><button type="button" onClick={()=>window.location.assign(returnTo)}>Continue</button><button type="button" disabled={verificationBusy} onClick={()=>void resendVerification()}>{verificationBusy?'Sending…':'Resend verification email'}</button><p role="status">{message}</p></section>}
 {mode==='login'&&!registrationComplete&&<button type="button" disabled={verificationBusy} onClick={()=>void resendVerification()}>{verificationBusy?'Sending…':'Resend verification email'}</button>}
 {mfa&&<button onClick={()=>setBackup(!backup)}>{backup?'Use authenticator':'Use recovery code'}</button>}
 <nav aria-label="Account"><a href="/login">Sign in</a> · <a href="/register">Register</a> · <a href="/recover">Forgot password</a> · <a href="/phone-login">Phone sign-in</a> · <a href="/phone-recovery">Phone recovery</a></nav></main>;
}
export function SignOut(){const [error,setError]=useState('');return <><button onClick={async()=>{try{const result=await authClient.signOut();if(result.error)throw Error();window.location.assign('/login');}catch{setError('Sign out failed. Please retry.');}}}>Sign out</button><p role="status">{error}</p></>;}
