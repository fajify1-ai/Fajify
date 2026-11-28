'use client';
import type {CustomerReturnTo} from './return-to';
import {useState} from 'react';
import {authPost} from '@faji/web-auth/client';
import {AuthForm} from '@faji/web-auth/form';
import CustomerAuthScreen from '../webapp/screens/CustomerAuthScreen';
import BusinessSignInScreen from '@faji/business-web/webapp/screens/BusinessSignInScreen';
export default function Authentication({business=false,register=false,returnTo='/customer#home'}:{business?:boolean;register?:boolean;returnTo?:CustomerReturnTo}){
 const [challenge,setChallenge]=useState(false);
 const destination=business?'/business/dashboard':returnTo;
 const registrationDestination=business?'/business/verification':returnTo;
 async function authenticate(mode:'signin'|'register',form:{email:string;password:string;name?:string;phone?:string;termsAccepted?:boolean}){
  const result=await authPost(mode==='register'?'sign-up/email':'sign-in/email',{email:form.email,password:form.password,...(mode==='register'?{name:form.name,phoneNumber:form.phone,termsAccepted:form.termsAccepted,callbackURL:window.location.origin}:{})});
  if(result.twoFactorRedirect){setChallenge(true);return;}
  if(mode==='register')return;
  window.location.assign(destination);
 }
 async function resendVerification(email:string){
  await authPost('send-verification-email',{email,callbackURL:window.location.origin});
 }
 if(challenge)return <div className="auth-design"><section className="auth-body"><AuthForm mode="login" initialSecondFactor returnTo={destination}/></section></div>;
 const recover=()=>location.assign('/recover');
 if(business&&!register)return <BusinessSignInScreen onBack={()=>location.assign('/')} onRegister={()=>location.assign('/business/register')} onRecovery={recover} onSignIn={()=>{}} onResendVerification={resendVerification} authenticate={(email,password)=>authenticate('signin',{email,password})}/>;
 return <CustomerAuthScreen initialMode={register?'register':'signin'} businessExperience={business} onBack={()=>location.assign(business?'/business':'/')} onComplete={()=>{}} onContinue={()=>window.location.assign(register?registrationDestination:destination)} onRecovery={recover} onResendVerification={resendVerification} authenticate={authenticate}/>;
}
