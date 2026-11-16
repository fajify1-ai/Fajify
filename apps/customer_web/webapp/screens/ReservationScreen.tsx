import { useState } from 'react'
import type { NavigateFn } from '../App'
import { IconArrowLeft } from '../components/Icons'

type Props = { venueId: string; navigate: NavigateFn }
const times = ['11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM','02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM','06:00 PM','06:30 PM','07:00 PM','07:30 PM','08:00 PM','08:30 PM','09:00 PM','09:30 PM','10:00 PM']
const dates = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]
export default function ReservationScreen({ venueId, navigate }: Props) {
  const [guests, setGuests] = useState('2 people')
  const [selectedDate, setSelectedDate] = useState(9)
  const [selectedTime, setSelectedTime] = useState('06:00 PM')
  return <main className="min-h-screen mx-auto max-w-[430px] bg-[#F8F8F8] px-5 pb-28 pt-12 font-[family-name:var(--font-ui)] text-[#202022]">
    <header className="relative text-center"><button onClick={() => navigate({ name: 'restaurant', id: venueId })} aria-label="Go back" className="absolute left-0 top-0 grid h-12 w-12 place-items-center rounded-full bg-white"><IconArrowLeft size={25} color="#202022" /></button><h1 className="m-0 pt-1 text-[26px] font-bold leading-[1.08] tracking-[-.04em]">Book Your<br />Reservation here</h1>
      <div className="mt-8 flex items-center"><i className="h-1 flex-1 bg-[#ff4741]" />{[1,2,3,4].map(step => <span key={step} className={`relative grid h-6 w-6 place-items-center rounded-full text-xs ${step < 3 ? 'bg-[#ff4741] text-white' : 'bg-white text-transparent'}`}>{step < 3 ? '✓' : '•'}</span>)}<i className="h-1 flex-1 bg-white" /></div>
      <div className="mt-5 grid grid-cols-4 text-[13px] font-semibold"><span>Venue</span><span>Date and<br />Time</span><span>Check Out</span><span>Booked</span></div>
    </header>
    <section className="mt-6 flex items-center justify-between bg-white px-2 py-2 text-[16px]"><span>Number of guest</span><select value={guests} onChange={e => setGuests(e.target.value)} className="rounded-lg border border-[#ddd] bg-white px-2 py-1.5 text-[16px]"><option>2 people</option><option>3 people</option><option>4 people</option><option>6 people</option></select></section>
    <h2 className="mb-3 mt-3 text-[16px] font-bold">Date</h2>
    <section className="rounded-[18px] bg-white p-4"><div className="flex items-center justify-between"><button className="text-3xl">‹</button><select className="rounded-lg border border-[#ddd] px-3 py-1"><option>Sep</option></select><select className="rounded-lg border border-[#ddd] px-3 py-1"><option>2025</option></select><button className="text-3xl">›</button></div><div className="mt-4 grid grid-cols-7 gap-y-3 text-center text-[13px] text-[#797477]">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <span key={day}>{day}</span>)}</div><div className="mt-3 grid grid-cols-7 gap-y-2 text-center">{Array.from({ length: 1 }).map((_, i) => <span key={`x${i}`} />)}{dates.map(day => <button key={day} onClick={() => setSelectedDate(day)} className={`mx-auto grid h-10 w-10 place-items-center rounded-lg text-[16px] ${selectedDate === day ? 'bg-[#ff4741] text-white' : ''}`}>{day}</button>)}</div></section>
    <h2 className="mb-4 mt-6 text-[16px] font-bold">Time</h2><section className="grid grid-cols-3 gap-x-7 gap-y-3">{times.map(time => <button key={time} disabled={['05:00 PM','07:00 PM','08:00 PM','09:00 PM'].includes(time)} onClick={() => setSelectedTime(time)} className={`rounded bg-white py-2 text-[15px] ${selectedTime === time ? 'bg-[#ff4741] text-white' : ''} disabled:text-[#aaa]`}>{time}</button>)}</section>
    <div className="mt-9 flex justify-between text-[16px]"><span>Reservation fee for <b>{guests}</b></span><b>₦ 40,000</b></div><button onClick={() => navigate({ name: 'checkout', venueId, bookingDate: `Sep ${selectedDate}, 2025`, bookingTime: selectedTime })} className="mt-5 flex w-full items-center justify-center gap-4 rounded-full bg-[#ff4741] py-4 text-[16px] font-medium text-white">Book Reservation- <b>₦ 40,000</b><span className="text-2xl">»</span></button>
  </main>
}
