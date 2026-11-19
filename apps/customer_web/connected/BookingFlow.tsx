'use client';
import {useState} from 'react';
import CheckoutScreen from '../webapp/screens/CheckoutScreen';
import ReservationScreen from '../webapp/screens/ReservationScreen';
import type {NavigateFn} from '../webapp/App';
import {State,More,useResource,usePages,platform,requestKey,money} from '@faji/web-ui/client';
import type {Schema} from '@faji/web-ui/types';
export default function BookingFlow({id,mode,navigate,open}:{id:string;mode:'reservation'|'checkout';navigate:NavigateFn;open:(screen:string,id?:string)=>void}){
 const item=useResource<Schema<'OfferingDetail'>>(`discovery/offerings/${id}`),slots=usePages<Schema<'SlotPage'>>(`discovery/offerings/${id}/availability`),profile=useResource<Schema<'ProfileView'>>('customer/profile');
 const [selected,setSelected]=useState<string|null>(null),[guests,setGuests]=useState(1),[guestName,setGuestName]=useState<string|null>(null),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hold,setHold]=useState<Schema<'M5HoldResponse'>|null>(null),[reservation,setReservation]=useState<Schema<'ReservationView'>|null>(null),[key,setKey]=useState(requestKey);
 const selection=selected??slots.data?.items.find(slot=>slot.remaining>=guests)?.id??'',slot=slots.data?.items.find(value=>value.id===selection),name=guestName??profile.data?.displayName??'';
 const payment=useResource<Schema<'PaymentStatusResponse'>>(hold?`customer/payments/${hold.paymentIntentId}`:null);
 const revise=(next:()=>void)=>{if(hold||reservation)return;next();setKey(requestKey());};
 async function submit(){
  if(!item.data||!name.trim()||name.length>120){setError('Enter a guest name up to 120 characters.');return;}
  setBusy(true);setError('');if(selected===null&&selection)setSelected(selection);
  try{
   if(hold){
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Enter your receipt email before continuing.');return;}
    await platform<Schema<'M5CheckoutResponse'>>(`customer/payments/${hold.paymentIntentId}/checkout`,{email});
    payment.reload();return;
   }
   if(item.data.customerReservationEnabled){setReservation(await platform<Schema<'ReservationView'>>('customer/reservations',{availabilityId:selection,guests,guestName:name,requestKey:key}));}
   else setHold(await platform<Schema<'M5HoldResponse'>>('customer/paid-holds',{kind:item.data.category==='event'?'ticket':'reservation',sourceId:item.data.category==='event'?id:selection,quantity:guests,guestName:name,requestKey:key}));
  }catch(error){setError(error instanceof Error?error.message:'Booking unavailable.');}finally{setBusy(false);}
 }
 if(item.loading||item.error||!item.data)return <State loading={item.loading} error={item.error} retry={item.reload}/>;
 if(mode==='reservation'&&slots.loading)return <State loading/>;
 const detail=item.data,total=hold?.amountMinor??String(BigInt(detail.priceMinor)*BigInt(detail.package?.pricingModel==='per_group'?1:guests)),price=money(total,hold?.currency??detail.currency);
 if(mode==='reservation')return <ReservationScreen key={id} venueId={id} navigate={navigate} live={{slots:slots.data?.items??[],selectedSlot:selection,selectSlot:value=>revise(()=>setSelected(value)),guests,setGuests:value=>revise(()=>setGuests(value)),price,onBack:()=>open('offering',id),status:<><State loading={slots.loading} error={slots.error} empty={slots.data?.items.length===0} retry={slots.reload}/><More resource={slots}/></>,onContinue:()=>open('checkout',id)}}/>;
 const safeTotal=Number(total);if(!Number.isSafeInteger(safeTotal))return <State error="This amount cannot be displayed safely. Contact the venue before continuing."/>;
 return <CheckoutScreen key={`${id}:${selection}:${guests}`} venueId={id} navigate={navigate} bookingDate={slot?new Date(slot.startsAt).toLocaleDateString():undefined} bookingTime={slot?new Date(slot.startsAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}):undefined} connected={{venue:{name:detail.name,location:detail.branchName,image:detail.media[0]?.url??'',inclusions:detail.package?detail.package.components.map(component=>({icon:'✓',label:`${component.quantity} × ${component.name}`})):[{icon:'✓',label:detail.name}],date:slot?new Date(slot.startsAt).toLocaleDateString():'See event details',time:slot?new Date(slot.startsAt).toLocaleTimeString():'Venue schedule',guests:`${guests} Guests`,basePrice:safeTotal/100,discount:0},guests,onBack:()=>open('offering',id),onEdit:()=>{if(!hold&&!reservation)open('reservation',id);else setError('A submitted hold or reservation cannot be edited here. Start another booking from discovery.');},onPay:()=>void submit(),busy,canPay:!reservation&&payment.data?.status!=='succeeded'&&(detail.category==='event'||!!slot),confirmed:reservation?.status==='confirmed',actionLabel:reservation?'Reservation submitted':hold?'Start simulated payment':detail.customerReservationEnabled?'Reserve a place':'Hold a place',payment:<div className="connected-adapter faji-stack"><label>Guest name<input required maxLength={120} disabled={!!hold||!!reservation} value={name} onChange={event=>setGuestName(event.target.value)}/></label>{hold&&<label>Receipt email<input type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>}<p>{hold?'Your place is held temporarily. A hold is not a confirmed booking.':detail.customerReservationEnabled?'The server confirms availability when you submit.':'Capacity and final price are determined by the server when you request a hold.'}</p><p>No provider is contacted and no money is taken. In this development simulation, only an authorized finance administrator can record a payment outcome.</p></div>,status:<><State error={error}/>{reservation&&<p role="status">Reservation {reservation.id}: {reservation.status}</p>}{hold&&<><p role="status">Hold {hold.status} · Expires {new Date(hold.expiresAt).toLocaleString()}</p><State loading={payment.loading} error={payment.error} retry={payment.reload}/>{payment.data&&<p>Simulated payment: {payment.data.status}</p>}<button className="faji-outline" onClick={payment.reload}>Refresh payment status</button>{payment.data?.status==='succeeded'&&<a href={`/receipts/${hold.paymentIntentId}`}>View payment receipt</a>}</>}<button className="faji-outline" onClick={()=>open('myTickets')}>Bookings & tickets</button></>}}/>;
}
