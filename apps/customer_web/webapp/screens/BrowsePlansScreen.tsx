import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import CalendarSheet from '../components/CalendarSheet'
import BottomNav from '../components/BottomNav'

type Props = { navigate: NavigateFn; livePlans?: typeof plans; onBook?: (id:string)=>void }

const RED = '#FA3F38'

const BUDGETS = ['Under ₦100k', 'Under ₦500k', 'Under ₦50k', 'Under ₦1M', 'All Plans']

const plans = [
  {
    id: 'plan1',
    name: 'ILASHE BEACH',
    image: '/reference/5b1a13863688703c.jpg',
    inclusions: ['Beach Access & Accommodation', 'Buffet Included', 'All Game Activities'],
    price: 100000,
    maxPeople: 10,
    category: 'Beach',
  },
  {
    id: 'plan2',
    name: 'GAME NIGHT',
    image: '/reference/cff164fdec54d885.jpg',
    inclusions: ['Uno Cards', 'Truth Or Dare Cards', 'Jenga', '6 Shot Glasses'],
    price: 35000,
    maxPeople: 6,
    category: 'Experience',
  },
  {
    id: 'plan3',
    name: 'FOOD TRAY',
    image: '/reference/1f74b117ffb63678.jpg',
    inclusions: ['Boneless Wings / Chicken Bites', 'Fried Chicken', 'Seasoned Fries', '1 Litre Coca-Cola'],
    price: 50000,
    maxPeople: 4,
    category: 'Food',
  },
  {
    id: 'plan4',
    name: 'ROOFTOP DINNER',
    image: '/reference/f96fe691379cca71.jpg',
    inclusions: ['3-Course Dinner', 'Welcome Cocktails', 'Live Music', 'Skyline View'],
    price: 85000,
    maxPeople: 8,
    category: 'Dining',
  },
  {
    id: 'plan5',
    name: 'SPA & RELAX DAY',
    image: '/reference/b4b5ff17a50bbc1e.jpg',
    inclusions: ['Full Body Massage', 'Facial Treatment', 'Sauna Access', 'Herbal Tea Included'],
    price: 45000,
    maxPeople: 2,
    category: 'Wellness',
  },
  {
    id: 'plan6',
    name: 'CINEMA PACKAGE',
    image: '/reference/6e51f3de99b67920.jpg',
    inclusions: ['2 Movie Tickets', 'Large Popcorn & Drinks', 'Reserved Seats', 'Parking Pass'],
    price: 18000,
    maxPeople: 2,
    category: 'Cinema',
  },
]

const BUDGET_LIMITS: Record<string, number> = {
  'Under ₦50k':  50000,
  'Under ₦100k': 100000,
  'Under ₦500k': 500000,
  'Under ₦1M':   1000000,
  'All Plans':   Infinity,
}

const PEOPLE_OPTIONS = ['1 person', '2 people', '3–4 people', '5–6 people', '7–10 people', '10+ people']

function fmt(n: number) { return '₦' + n.toLocaleString('en-NG') }

export default function BrowsePlansScreen({ navigate, livePlans, onBook }: Props) {
  const { dark } = useDarkMode()
  const [activeBudget, setActiveBudget] = useState('Under ₦100k')
  const [guests,   setGuests]   = useState<Record<string, string>>({})
  const [calOpen,  setCalOpen]  = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888'    : '#777'
  const border  = dark ? '#2A2A2A' : '#E8E8E8'

  const limit    = BUDGET_LIMITS[activeBudget] ?? Infinity
  const filtered = (livePlans ?? plans).filter(p => p.price <= limit)

  return (
    <div className="min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>
      {/* Header */}
      <div className="flex items-center gap-4 sticky top-0 z-10 px-5 pt-14 pb-4 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
          className="flex h-10 w-10 items-center justify-center rounded-full border"
          style={{ background: bg, borderColor: border }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-[20px] font-black tracking-[-0.02em]" style={{ color: ink }}>Browse Plans</h1>
      </div>

      {/* Budget filter */}
      <div className="flex gap-3 overflow-x-auto px-5 py-5 [scrollbar-width:none] md:flex-wrap md:px-10 lg:px-16">
        {BUDGETS.map(b => {
          const active = activeBudget === b
          return (
            <button key={b} onClick={() => setActiveBudget(b)}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all"
              style={{ background: active ? RED : surface, color: active ? '#fff' : RED, border: `2px solid ${RED}` }}>
              {b}
            </button>
          )
        })}
      </div>

      {/* Plan cards */}
      <div className="grid w-full grid-cols-1 gap-5 px-4 pb-24 md:grid-cols-2 md:px-10 xl:grid-cols-3 lg:px-16">
        {filtered.length === 0 && (
          <div className="py-20 text-center md:col-span-2 xl:col-span-3">
            <p className="text-[16px] font-bold" style={{ color: ink }}>No plans in this range</p>
            <p className="text-[13px] mt-1" style={{ color: muted }}>Try a higher budget filter</p>
          </div>
        )}
        {filtered.map(plan => (
          <div key={plan.id} className="rounded-[20px] overflow-hidden"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex h-full flex-col">
              <img src={plan.image} alt={plan.name} className="h-[190px] w-full shrink-0 object-cover" />
              <div className="flex flex-col p-3.5 flex-1 min-w-0">
                <h2 className="text-[14px] font-black mb-2 leading-tight" style={{ color: ink }}>{plan.name}</h2>
                <div className="flex flex-col gap-0.5 mb-3 flex-1">
                  {plan.inclusions.map(inc => (
                    <p key={inc} className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: muted }}>
                      <span className="shrink-0">·</span><span>{inc}</span>
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2.5">
                  <select
                    value={guests[plan.id] ?? '2 people'}
                    onChange={e => setGuests(g => ({ ...g, [plan.id]: e.target.value }))}
                    className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none"
                    style={{ background: bg, borderColor: border, color: ink, maxWidth: 88 }}>
                    {PEOPLE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <span className="text-[15px] font-black" style={{ color: RED }}>
                    {fmt(plan.price)}
                  </span>
                </div>
                <button
                  onClick={() => { setPendingPlanId(plan.id); setCalOpen(true) }}
                  className="w-full rounded-full py-2 text-[13px] font-black text-white"
                  style={{ background: RED }}>
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CalendarSheet
        open={calOpen}
        onClose={() => { setCalOpen(false); setPendingPlanId(null) }}
        onConfirm={(date, time) => {
          if (pendingPlanId) navigate({ name: 'checkout', venueId: pendingPlanId, bookingDate: date, bookingTime: time })
          setCalOpen(false)
          setPendingPlanId(null)
        }}
        venueTimeType="default"
      />
      <BottomNav active="home" navigate={navigate} />
    </div>
  )
}
