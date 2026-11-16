"use client"
import dynamic from 'next/dynamic'
const App = dynamic(() => import('./App'), { ssr: false, loading: () => <main className="p-8" aria-busy="true">Loading Fajify Business…</main> })
export default function Client() { return <App /> }
