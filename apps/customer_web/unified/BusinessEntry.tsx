"use client";
import BusinessEntry from '@faji/business-web/webapp/components/BusinessEntry';
export default function Entry(){return <BusinessEntry preview={false} onBack={()=>location.assign('/')} onSignIn={()=>location.assign('/business/login')} onRegister={()=>location.assign('/business/register')} onExplore={()=>location.assign('/business/dashboard')}/>;}
