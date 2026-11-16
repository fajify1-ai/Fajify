'use client';
import EventDetailScreen from '../webapp/screens/EventDetailScreen';
import type {NavigateFn} from '../webapp/App';
import {State,useResource} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
export default function Event({id,navigate,open}:{id:string;navigate:NavigateFn;open:(screen:string,id?:string)=>void}){
 const item=useResource<Schema<'OfferingDetail'>>(`discovery/offerings/${id}`),availability=useResource<{data:Schema<'WebEventAvailability'>}>(`discovery/events/${id}/availability`);
 if(!item.data)return <State loading={item.loading} error={item.error} retry={item.reload}/>;
 const detail=item.data;if(!detail.event)return <State error="This offering does not have a published event schedule."/>;
 const inventory=availability.data?.data;
 return <EventDetailScreen id={id} navigate={navigate} remaining={inventory?.remaining??0} liveEvent={{id,title:detail.name,restaurantId:detail.branchId,restaurantName:detail.branchName,date:new Date(detail.event.startsAt).toLocaleString(),guests:inventory?.issued??0,maxGuests:inventory?.capacity??detail.event.maxGuests,ticketPrice:Number(detail.priceMinor)/100,image:detail.media[0]?.url??'',host:detail.businessName,hostAvatar:'',description:detail.description??detail.name,attendees:[]}} actions={<div className="connected-adapter faji-stack"><State loading={availability.loading} error={availability.error} retry={availability.reload}/><p>Availability includes temporary holds. Only backend confirmation and a server-issued ticket grant admission.</p><button className="faji-primary" disabled={!inventory||inventory.remaining<1} onClick={()=>open('checkout',id)}>Get tickets</button></div>}/>;
}
