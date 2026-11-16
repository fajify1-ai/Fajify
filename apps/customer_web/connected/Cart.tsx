'use client';
import {useRef,useState} from 'react';
import GlobalCartScreen from '../webapp/screens/GlobalCartScreen';
import type {NavigateFn} from '../webapp/App';
import type {CartItem} from '../webapp/store/cart';
import {State,Action,platform,useResource} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
type Cart=Schema<'WebCart'>;
async function savedCart(body?:{revision:number;items:Cart['items']}){return (await platform<{data:Cart}>('customer/cart',body,body?'PUT':'GET')).data;}
export function AddToCart({id}:{id:string}){return <Action label="Save item to cart" run={async()=>{const current=await savedCart(),existing=current.items.find(item=>item.catalogueId===id);await savedCart({revision:current.revision,items:existing?current.items.map(item=>item.catalogueId===id?{...item,quantity:Math.min(100,item.quantity+1)}:item):[...current.items,{catalogueId:id,quantity:1}]});}}/>;}
export default function Cart({navigate}:{navigate:NavigateFn}){
 const resource=useResource<{data:Cart}>('customer/cart'),[updated,setUpdated]=useState<Cart|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const pending=useRef(false);
 const data=updated&&updated.revision>=(resource.data?.data.revision??0)?updated:resource.data?.data;
 async function change(reduce:(items:Cart['items'])=>Cart['items']){
  if(pending.current||!data)return;pending.current=true;setBusy(true);setError('');
  try{setUpdated(await savedCart({revision:data.revision,items:reduce(data.items)}));}catch(e){setError(e instanceof Error?e.message:'Cart could not be saved.');}finally{pending.current=false;setBusy(false);}
 }
 const items:CartItem[]=(data?.items??[]).map(line=>{const quote=data?.quotes.find(item=>item.id===line.catalogueId);return {key:line.catalogueId,itemId:line.catalogueId,venueId:quote?.branch_id??'unavailable',venueName:quote?`${quote.business_name} · ${quote.branch_name}`:'Unavailable item',venueImage:quote?.media[0]?.url??'',name:quote?.name??'Item no longer available',price:quote?Number(quote.price_minor)/100:0,image:quote?.media[0]?.url??'',qty:line.quantity};});
 const mutate=(operation:(items:Cart['items'])=>Cart['items'])=>{void change(operation);};
 const state={items,totalQty:items.reduce((sum,item)=>sum+item.qty,0),totalPrice:items.reduce((sum,item)=>sum+item.price*item.qty,0),addItem:(item:Omit<CartItem,'key'|'qty'>)=>mutate(lines=>lines.map(line=>line.catalogueId===item.itemId?{...line,quantity:Math.min(100,line.quantity+1)}:line)),removeItem:(key:string)=>mutate(lines=>lines.flatMap(line=>line.catalogueId===key?line.quantity>1?[{...line,quantity:line.quantity-1}]:[]:[line])),deleteItem:(key:string)=>mutate(lines=>lines.filter(line=>line.catalogueId!==key)),clear:()=>mutate(()=>[]),clearVenue:(venue:string)=>mutate(lines=>lines.filter(line=>!items.some(item=>item.itemId===line.catalogueId&&item.venueId===venue))),venueItems:(venue:string)=>items.filter(item=>item.venueId===venue)};
 return <GlobalCartScreen navigate={navigate} connected={{cart:state,busy,status:<><State loading={resource.loading} error={error||resource.error} retry={()=>{setUpdated(null);resource.reload();}}/>{data&&data.quotes.length<data.items.length&&<p role="status" className="connection-state">Some items are unavailable and are excluded from the displayed estimate. Remove them before ordering.</p>}</>,payment:<div className="connected-adapter"><p>Your cart is saved to your account. Displayed totals are an estimate of currently available items; the server determines final prices when an order is placed.</p><p>Combined cart checkout is unavailable. Order individual products from their offering pages; payment and delivery are separate workflows.</p><p>Courier and dispatch: Coming Soon.</p><a className="faji-outline" href="/demo-checkout">Explore demo checkout · no real money</a></div>}}/>;
}
