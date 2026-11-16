'use client';
import {useState} from 'react';
import {authPost} from '@faji/web-auth/client';
import {AuthForm} from '@faji/web-auth/form';
import CustomerAuthScreen from '../webapp/screens/CustomerAuthScreen';
import BusinessSignInScreen from '@faji/business-web/webapp/screens/BusinessSignInScreen';
export default function Authentication({business=false,register=false}:{business?:boolean;register?:boolean}){
 const [challenge,setChallenge]=useState(false);
 const destination=business?'/business/dashboard':'/customer';
 async function authenticate(mode:'signin'|'register',form:{email:string;password:string;name?:string}){
  const result=await authPost(mode==='register'?'sign-up/email':'sign-in/email',{email:form.email,password:form.password,...(mode==='register'?{name:form.name}:{})});
  if(result.twoFactorRedirect){setChallenge(true);return;}
  window.location.assign(destination);
 }
 if(challenge)return <div className="auth-design"><section className="auth-body"><AuthForm mode="login" initialSecondFactor returnTo={destination}/></section></div>;
 const recover=()=>location.assign('/recover');
 if(business&&!register)return <BusinessSignInScreen onBack={()=>location.assign('/business')} onRegister={()=>location.assign('/business/register')} onRecovery={recover} onSignIn={()=>{}} authenticate={(email,password)=>authenticate('signin',{email,password})}/>;
 return <CustomerAuthScreen initialMode={register?'register':'signin'} onBack={()=>location.assign(business?'/business':'/')} onComplete={()=>{}} onRecovery={recover} authenticate={authenticate}/>;
}
