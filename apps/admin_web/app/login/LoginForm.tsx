'use client';

import {useState,type FormEvent} from 'react';
import {authPost} from '@faji/web-auth/client';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginForm(){
 const [busy,setBusy]=useState(false);
 const [showPassword,setShowPassword]=useState(false);
 const [secondFactor,setSecondFactor]=useState(false);
 const [stepUp,setStepUp]=useState(false);
 const [useBackupCode,setUseBackupCode]=useState(false);
 const [password,setPassword]=useState('');
 const [message,setMessage]=useState('');

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  setMessage('');
  const values=new FormData(event.currentTarget);
  const email=String(values.get('email')??'').trim();
  const code=String(values.get('code')??'').trim();
  try{
   if(stepUp){
    await authPost('faji/step-up',{password,code:useBackupCode?undefined:code||undefined,backupCode:useBackupCode?code:undefined});
    setPassword('');
    window.location.assign('/dashboard');
    return;
   }
   if(secondFactor){
    await authPost(`two-factor/${useBackupCode?'verify-backup-code':'verify-totp'}`,{code,trustDevice:false});
    setSecondFactor(false);
    setStepUp(true);
    setUseBackupCode(false);
    setMessage('Factor verified. Enter a fresh authenticator or unused recovery code to confirm privileged access.');
    return;
   }
   const result=await authPost('sign-in/email',{email,password});
   if(result.twoFactorRedirect){
    setSecondFactor(true);
    setMessage('Enter the code from your authenticator app to continue.');
    return;
   }
   await authPost('faji/step-up',{password});
   setPassword('');
   setMessage('');
   window.location.assign('/dashboard');
  }catch(error){
   setMessage(error instanceof Error?error.message:'Sign-in failed. Check your details and try again.');
  }finally{
   setBusy(false);
  }
 }

 const heading=stepUp?'Confirm administrator access':secondFactor?'Verify your identity':'Welcome back';
 const subtitle=stepUp
  ?'Enter a fresh authenticator code or an unused recovery code to finish signing in.'
  :secondFactor?'Use the second factor configured for your account.':'Sign in to your Fajify administration workspace.';

 return <main className={styles.page}>
  <div className={styles.glow} aria-hidden="true"/>
  <header className={styles.brand}>
   <Image className={styles.logo} src="/brand/fajify-logo-primary-horizontal.svg" alt="Fajify" width={110} height={41} priority/>
   <span className={styles.brandAdmin}>ADMIN</span>
  </header>
  <section className={styles.card} aria-labelledby="login-title">
   <div className={styles.eyebrow}>OPERATION PORTAL</div>
   <h1 id="login-title">{heading}</h1>
   <p className={styles.subtitle}>{subtitle}</p>
   <form onSubmit={submit} className={styles.form}>
    {!secondFactor&&!stepUp&&<>
     <label htmlFor="admin-email">Work email</label>
     <input id="admin-email" name="email" type="email" autoComplete="username" inputMode="email" maxLength={254} required autoFocus/>
    </>}
    {!secondFactor&&!stepUp&&<div className={styles.passwordLabel}>
     <label htmlFor="admin-password">Password</label>
    </div>}
    {!secondFactor&&!stepUp&&<div className={styles.passwordField}>
     <input id="admin-password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" maxLength={128} required value={password} onChange={event=>setPassword(event.target.value)}/>
     <button className={styles.reveal} type="button" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword}>
      {showPassword?'Hide':'Show'}
     </button>
    </div>}
    {stepUp&&<>
     <label htmlFor="admin-step-up-code">{useBackupCode?'Unused recovery code':'Fresh authenticator code'}</label>
     <input id="admin-step-up-code" name="code" type="text" autoComplete="one-time-code" inputMode={useBackupCode?'text':'numeric'} maxLength={128} required autoFocus/>
    </>}
    {secondFactor&&<>
     <label htmlFor="admin-code">{useBackupCode?'Recovery code':'Authenticator code'}</label>
     <input id="admin-code" name="code" type="text" autoComplete="one-time-code" inputMode={useBackupCode?'text':'numeric'} maxLength={128} required autoFocus/>
    </>}
    {message&&<p className={styles.message} role="alert">{message}</p>}
    <button className={styles.submit} type="submit" disabled={busy}>
     {busy?<><span className={styles.spinner} aria-hidden="true"/>Signing in…</>:stepUp?'Confirm and continue':secondFactor?'Verify and continue':'Sign in securely'}
    </button>
   </form>
   {(secondFactor||stepUp)&&<button type="button" className={styles.textButton} onClick={()=>{setUseBackupCode(value=>!value);setMessage('');}}>
    {useBackupCode?'Use authenticator code':'Use a recovery code'}
   </button>}
  </section>
 </main>;
}
