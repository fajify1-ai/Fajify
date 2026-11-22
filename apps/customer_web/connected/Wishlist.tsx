"use client";
import {useState} from 'react';
import WishlistScreen from '../webapp/screens/WishlistScreen';
import type {NavigateFn} from '../webapp/App';
import {More,usePages,platform,money} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
export default function Wishlist({navigate,open}:{navigate:NavigateFn;open:(id:string)=>void}){
 const resource=usePages<Schema<'WishlistPage'>>('customer/wishlist');
 const [error,setError]=useState('');
 const loadError=resource.error==='The service is currently unavailable. No action has been confirmed.'
  ? 'The saved places service is temporarily unavailable. Please try again.'
  : resource.error;
 return <WishlistScreen navigate={navigate} liveItems={(resource.data?.items??[]).map(item=>({id:item.id,name:item.name,type:item.category,location:item.address??item.branchName,price:money(item.priceMinor,item.currency),tag:item.businessName,image:item.media[0]?.url,imageAlt:item.media[0]?.alt}))} loading={resource.loading} error={loadError} actionError={error} onRetry={resource.reload} onOpen={open} onRemove={id=>{setError('');void platform(`customer/wishlist/${id}`,undefined,'DELETE').then(resource.reload).catch(e=>setError(e instanceof Error?e.message:'Unable to remove saved place.'));}} pagination={<More resource={resource}/>}/>;
}
