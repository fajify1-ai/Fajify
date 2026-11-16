"use client";
import dynamic from 'next/dynamic';
const WebApp = dynamic(() => import('./App'), { ssr: false, loading: () => <main aria-busy="true" style={{padding:32}}>Loading Fajify…</main> });
export default function Client() { return <WebApp />; }
