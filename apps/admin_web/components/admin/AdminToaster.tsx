'use client';
import {useEffect,useState} from 'react';
import {Toaster} from 'sonner';

export function AdminToaster(){
 const [theme,setTheme]=useState<'light'|'dark'>('light');
 useEffect(()=>{
  const update=()=>setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light');
  update();
  const observer=new MutationObserver(update);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  return ()=>observer.disconnect();
 },[]);
 return <Toaster closeButton position="top-right" richColors theme={theme}/>;
}
