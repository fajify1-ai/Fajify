"use client";
import {useState, type FormEvent} from 'react';
import {authClient} from './client';
export function AuthForm({mode}:{mode:'login'|'register'|'recover'|'reset'}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setMessage('');
  const values=new FormData(event.currentTarget);const email=String(values.get('email')??'');const password=String(values.get('password')??'');
  try{
   const result=mode==='login'?await authClient.signIn.email({email,password}):mode==='register'?await authClient.signUp.email({email,password,name:String(values.get('name'))}):mode==='recover'?await authClient.requestPasswordReset({email,redirectTo:window.location.origin+'/reset-password'}):await authClient.resetPassword({newPassword:password,token:new URLSearchParams(window.location.search).get('token')??''});
   if(result.error){setMessage(result.error.message??'Authentication failed');return;}
   if(mode==='login'||mode==='register')window.location.assign('/dashboard');
   else setMessage(mode==='recover'?'If the account exists, a recovery email has been sent.':'Password updated. You can sign in.');
  }catch{setMessage('Unable to reach authentication. Please try again.');}finally{setBusy(false);}
 }
 return <main style={{maxWidth:420,margin:'64px auto',padding:24}}><h1>{mode==='login'?'Sign in':mode==='register'?'Create your Faji account':mode==='recover'?'Recover your account':'Choose a new password'}</h1><form onSubmit={submit}>
 {mode==='register'&&<p><label>Name <input name="name" autoComplete="name" required maxLength={120}/></label></p>}
 {mode!=='reset'&&<p><label>Email <input name="email" type="email" autoComplete="email" required maxLength={254}/></label></p>}
 {mode!=='recover'&&<p><label>Password <input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:12} required maxLength={128}/></label></p>}
 <button disabled={busy} type="submit">{busy?'Please wait…':'Continue'}</button><p role="status">{message}</p></form><nav aria-label="Account"><a href="/login">Sign in</a> · <a href="/register">Register</a> · <a href="/recover">Forgot password</a></nav></main>;
}
export function SignOut(){const [error,setError]=useState('');return <><button onClick={async()=>{try{const result=await authClient.signOut();if(result.error)throw Error();window.location.assign('/login');}catch{setError('Sign out failed. Please retry.');}}}>Sign out</button><p role="status">{error}</p></>;}
