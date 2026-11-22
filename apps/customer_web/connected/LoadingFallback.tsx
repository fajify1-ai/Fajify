"use client";
import { useEffect, useState } from 'react';

export default function LoadingFallback(){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>setSlow(true),8000);return()=>window.clearTimeout(timer);},[]);
 return <main className="connected"><section className="connection-state" role="status" aria-live="polite">
  <p>{slow?'This is taking longer than expected.':'Loading Fajify…'}</p>
  {slow&&<button className="faji-primary" onClick={()=>window.location.reload()}>Reload Fajify</button>}
 </section></main>;
}
