import { addBooking } from '../store/bookings'
import { useState, useEffect, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import { IconArrowLeft } from '../components/Icons'

type Props = { restaurantId?: string; navigate: NavigateFn; live?:{fields:ReactNode;status:ReactNode;busy:boolean;onCreate:(value:{startsAt:string;capacity:number})=>void} }

const timeSlots = ['11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM']
const unavailable = new Set(['05:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'])
const calendarCells = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '1', '2', '3', '4']

export default function CreateEventScreen({ restaurantId, navigate, live }: Props) {
  const [guestCount, setGuestCount] = useState('2 people')
  const [date, setDate] = useState(()=>live?String(new Date().getDate()):'9')
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const liveCells=[...Array.from({length:month.getDay()},()=>''),...Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,index)=>String(index+1))]
  const [time, setTime] = useState('06:00 PM')
  useEffect(()=>{if(live)setDate(day=>String(Math.min(Number(day),new Date(month.getFullYear(),month.getMonth()+1,0).getDate())));},[month,!!live])

  const continuePlanning = () => {
    if(live){const [clock,period]=time.split(' ');const [hour,minute]=clock.split(':').map(Number);const startsAt=new Date(month.getFullYear(),month.getMonth(),Number(date),(hour%12)+(period==='PM'?12:0),minute);live.onCreate({startsAt:startsAt.toISOString(),capacity:parseInt(guestCount)});return;}

    addBooking({ id: `hangout-${Date.now()}`, venueId: restaurantId ?? 'v1', name: 'My Hangout', venue: 'Your selected venue', date: `Sep ${date}, 2025 · ${time}`, image: '/reference/0d2dd0d1594a9d13.jpg', price: 'Free', status: 'Upcoming', type: 'event', hasTransport: false, qrValue: 'FAJI:DEMO:HANGOUT', ref: `DEMO-HANGOUT-${Date.now()}`, guests: parseInt(guestCount) || 2 })
    navigate({
    name: 'confirmation',
    type: 'event',
    details: {
      title: 'My Hangout',
      restaurant: restaurantId ? 'Your selected venue' : 'Choose a venue next',
      date: `Sep ${date}, 2025`,
      time,
      maxGuests: guestCount,
      ticketPrice: 'Free',
      venue: 'Your selected venue',
      guests: guestCount,
    },
  })
  }

  return (
    <main data-original-screen={live?true:undefined} className="original-create-event min-h-screen mx-auto max-w-[430px] bg-[#F8F8F8] px-5 pt-12 pb-10 font-[family-name:var(--font-ui)] text-[#202022]">
      <header className="relative text-center">
        <button aria-label="Go back" onClick={() => navigate({ name: 'home' })} className="absolute left-0 top-0 grid h-12 w-12 place-items-center rounded-full border-0 bg-white shadow-[0_4px_14px_rgba(35,25,25,.025)]"><IconArrowLeft size={25} color="#202022" /></button>
        <h1 className="m-0 pt-1 text-[26px] font-bold leading-[1.08] tracking-[-.04em]">Plan a<br />Hangout</h1>
        <div className="relative mx-auto mt-8 h-6 w-[332px] max-w-[calc(100%-52px)]">
          <div className="absolute left-0 right-0 top-[10px] h-1 rounded-full bg-[#f1eeee]" />
          <div className="absolute left-0 top-[10px] h-1 w-[34%] rounded-full bg-[#ff4741]" />
          <div className="relative z-10 flex justify-between">
            {[0, 1, 2, 3].map((step) => <span key={step} className={`grid h-6 w-6 place-items-center rounded-full text-[12px] ${step < 2 ? 'bg-[#ff4741] text-white' : 'bg-white text-transparent'}`}>{step < 2 ? '✓' : '•'}</span>)}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 text-[13px] font-semibold leading-4"><span>Venue</span><span>Date and<br />Time</span><span>Check Out</span><span>Booked</span></div>
      </header>

      {live?.fields}
      <section className="mt-6 flex h-12 items-center justify-between bg-white px-2 text-[16px]">
        <span>Number of guest</span>
        <select aria-label="Guest capacity" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} className="rounded-lg border border-[#ddd] bg-white px-2 py-1.5 text-[16px] outline-none"><option>2 people</option><option>3 people</option><option>4 people</option><option>6 people</option></select>
      </section>

      <h2 className="mb-3 mt-3 text-[16px] font-bold">Date</h2>
      <section className="rounded-[18px] bg-white px-4 pb-5 pt-4">
        <div className="grid grid-cols-[36px_1fr_1fr_36px] items-center gap-2"><button aria-label="Previous month" onClick={()=>live&&setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} className="text-3xl leading-none">‹</button><select aria-label="Month" value={live?month.getMonth():undefined} onChange={event=>setMonth(new Date(month.getFullYear(),Number(event.target.value),1))} className="h-8 rounded-lg border border-[#ddd] bg-white px-2 outline-none">{live?Array.from({length:12},(_,index)=><option key={index} value={index}>{new Date(2026,index,1).toLocaleString(undefined,{month:'short'})}</option>):<option>Sep</option>}</select><select aria-label="Year" value={live?month.getFullYear():undefined} onChange={event=>setMonth(new Date(Number(event.target.value),month.getMonth(),1))} className="h-8 rounded-lg border border-[#ddd] bg-white px-2 outline-none">{live?Array.from({length:6},(_,index)=><option key={index}>{new Date().getFullYear()+index}</option>):<option>2025</option>}</select><button aria-label="Next month" onClick={()=>live&&setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} className="text-3xl leading-none">›</button></div>
        <div className="mt-4 grid grid-cols-7 text-center text-[13px] text-[#797477]">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">{(live?liveCells:calendarCells).map((day, index) => {
          const muted = !live&&index > 30
          return day ? <button key={`${day}-${index}`} onClick={() => !muted && setDate(day)} disabled={muted} className={`mx-auto grid h-10 w-10 place-items-center rounded-lg text-[16px] ${date === day && !muted ? 'bg-[#ff4741] text-white' : ''} ${muted ? 'text-[#bbb]' : ''}`}>{day}</button> : <span key="blank" />
        })}</div>
      </section>

      <div className="mb-4 mt-6 flex items-center justify-between"><h2 className="m-0 text-[16px] font-bold">Time</h2><span className="text-[12px] font-semibold text-[#ff4741]">Selected: {time}</span></div>
      <section className="grid grid-cols-3 gap-x-8 gap-y-3 px-3">{timeSlots.map((slot) => {
        const isUnavailable = !live&&unavailable.has(slot)
        const isSelected = time === slot
        return <button key={slot} type="button" disabled={isUnavailable} aria-pressed={isSelected} onClick={() => setTime(slot)} className={`min-w-0 rounded py-2 text-[15px] whitespace-nowrap transition-colors ${isSelected ? 'bg-[#ff4741] text-white shadow-[0_5px_10px_rgba(255,71,65,.18)]' : 'bg-white text-[#202022]'} ${isUnavailable ? 'cursor-not-allowed text-[#aaa]' : 'active:scale-[.98]'}`}>{slot}</button>
      })}</section>

      <div className="mt-9 flex items-center justify-between text-[16px]"><span>{live?'Gathering capacity':'Reservation fee for'} <b>{guestCount}</b></span><b>{live?'No payment':'₦ 40,000'}</b></div>
      <button disabled={live?.busy} onClick={continuePlanning} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#ff4741] py-4 text-[16px] font-medium text-white shadow-[0_8px_18px_rgba(255,71,65,.16)]">{live?live.busy?'Saving gathering…':'Create gathering':'Continue to Checkout - '} {!live&&<b>₦ 40,000</b>}<span className="ml-2 text-2xl leading-none">»</span></button>
      {live?.status}
    </main>
  )
}
