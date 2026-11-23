import {useRef} from 'react';

export type AdminPage<T>={items:T[];nextOffset:number|null};

export async function adminRequest<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch('/api/platform/'+path,{
  method:body===undefined?'GET':'POST',
  credentials:'same-origin',
  cache:'no-store',
  headers:{'content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)})
 });
 const text=await response.text();
 let result:unknown;
 try{result=text?JSON.parse(text):null;}catch{throw new Error('The administration service returned an invalid response.');}
 if(!response.ok){
  const message=result&&typeof result==='object'&&'message'in result&&typeof result.message==='string'?result.message:`Request failed (${response.status}).`;
  throw new Error(message);
 }
 return result as T;
}

export function useAdminCommand(){
 const keys=useRef(new Map<string,string>());
 return async function run<T>(path:string,payload:Record<string,unknown>):Promise<T>{
  const signature=path+JSON.stringify(payload);
  const requestKey=keys.current.get(signature)??crypto.randomUUID();
  keys.current.set(signature,requestKey);
  const result=await adminRequest<T>(path,{...payload,requestKey});
  keys.current.delete(signature);
  return result;
 };
}
