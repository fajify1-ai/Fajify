"use client";
import dynamic from 'next/dynamic';
const App=dynamic(()=>import('./CustomerApp'),{ssr:false,loading:()=> <main className="connection-state" role="status">Loading Fajify…</main>});
export default function Client({initial='landing'}:{initial?:string}){return <App initial={initial}/>;}
