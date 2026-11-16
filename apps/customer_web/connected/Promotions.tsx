"use client";
import OffersScreen from '../webapp/screens/OffersScreen';
import type {NavigateFn} from '../webapp/App';
import {State,More,usePages} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
export default function Promotions({navigate}:{navigate:NavigateFn}){
 const resource=usePages<{items:Schema<'WebPromotion'>[];nextOffset:number|null}>('customer/promotions',true);
 return <OffersScreen navigate={navigate} livePromos={(resource.data?.items??[]).map(item=>({id:item.id,pct:'Merchant offer',title:item.title,desc:item.description,expiry:`Ends ${new Date(item.expires_at).toLocaleString()}`,gradient:['#D92D27','#9B2222'],icon:'tag'}))} status={<State loading={resource.loading} error={resource.error} empty={resource.data?.items.length===0} retry={resource.reload}/>} pagination={<More resource={resource}/>}/>;
}
