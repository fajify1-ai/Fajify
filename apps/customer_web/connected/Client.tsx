"use client";
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';
import LoadingFallback from './LoadingFallback';

class CustomerAppBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="connected"><section className="connection-state" role="alert"><h1>We couldn’t open Fajify</h1><p>Reload the page to try again.</p><button className="faji-primary" onClick={()=>window.location.reload()}>Reload Fajify</button></section></main>:this.props.children;}
}

const App=dynamic(()=>import('./CustomerApp'),{ssr:false,loading:LoadingFallback});
export default function Client({initial='landing'}:{initial?:string}){return <CustomerAppBoundary><App initial={initial}/></CustomerAppBoundary>;}
