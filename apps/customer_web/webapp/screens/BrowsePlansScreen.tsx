import { useState, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import CalendarSheet from '../components/CalendarSheet'
import BottomNav from '../components/BottomNav'

type BrowsePlan = { id:string; name:string; image:string; inclusions:string[]; price:number; currency?:string; minPeople?:number; maxPeople:number; category:string }
type Props = {
  navigate: NavigateFn
  livePlans?: BrowsePlan[]
  onBook?: (id:string)=>void
  activeBudget?: string
  onBudgetChange?: (budget:string)=>void
  hasAppliedFilters?: boolean
  onClearFilters?: ()=>void
  loading?: boolean
  error?: string
  onRetry?: ()=>void
  filters?: ReactNode
  pagination?: ReactNode
}

const RED = '#FA3F38'

const BUDGETS = ['Under ₦100k', 'Under ₦500k', 'Under ₦50k', 'Under ₦1M', 'All Plans']

const plans:BrowsePlan[] = [
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

function fmt(n: number, currency='NGN') {
  try { return new Intl.NumberFormat('en-NG',{style:'currency',currency}).format(n) }
  catch { return 'Price unavailable' }
}

export default function BrowsePlansScreen({
  navigate,
  livePlans,
  onBook,
  activeBudget: selectedBudget,
  onBudgetChange,
  hasAppliedFilters = false,
  onClearFilters,
  loading = false,
  error,
  onRetry,
  filters,
  pagination,
}: Props) {
  const { dark } = useDarkMode()
  const [localBudget, setLocalBudget] = useState('Under ₦100k')
  const [guests,   setGuests]   = useState<Record<string, string>>({})
  const [calOpen,  setCalOpen]  = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)

  const activeBudget=selectedBudget??localBudget
  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888'    : '#777'
  const border  = dark ? '#2A2A2A' : '#E8E8E8'

  const limit    = BUDGET_LIMITS[activeBudget] ?? Infinity
  const allPlans = livePlans ?? plans
  const filtered = allPlans.filter(p => p.price <= limit)
  const liveMode = livePlans !== undefined
  const narrowed = activeBudget !== 'All Plans' || hasAppliedFilters

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
      <div className="flex flex-col gap-3 px-5 py-4 md:px-10 lg:px-16">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap">
        {BUDGETS.map(b => {
          const active = activeBudget === b
          return (
            <button key={b} onClick={() => {setLocalBudget(b);onBudgetChange?.(b)}}
              aria-pressed={active}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all"
              style={{ background: active ? RED : 'transparent', color: active ? '#fff' : RED, border: `1px solid ${RED}` }}>
              {b}
            </button>
          )
        })}
        </div>
        {filters}
      </div>

      {/* Plan cards */}
      <div className="grid w-full grid-cols-1 gap-5 px-4 pb-24 md:grid-cols-2 md:px-10 xl:grid-cols-3 lg:px-16">
        {loading && (
          <div className="rounded-2xl border p-8 text-center md:col-span-2 xl:col-span-3" role="status" aria-live="polite" style={{ background: surface, borderColor: border }}>
            <p className="m-0 text-sm" style={{ color: muted }}>Loading available plans…</p>
          </div>
        )}
        {!loading && error && (
          <div className="rounded-2xl border p-8 text-center md:col-span-2 xl:col-span-3" role="alert" style={{ background: surface, borderColor: border }}>
            <p className="m-0 text-sm" style={{ color: ink }}>{error}</p>
            {onRetry && <button className="faji-outline mt-4" onClick={onRetry}>Try again</button>}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border px-6 py-12 text-center md:col-span-2 xl:col-span-3 md:py-16" style={{ background: surface, borderColor: border }}>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full text-lg font-black" aria-hidden="true" style={{ background: dark ? '#321918' : '#FFF1F0', color: RED }}>f.</div>
            <p className="m-0 text-base font-bold" style={{ color: ink }}>{narrowed ? 'No plans match these filters' : 'No plans available yet'}</p>
            <p className="mx-auto mb-0 mt-2 max-w-md text-sm" style={{ color: muted }}>
              {narrowed
                ? 'Try a higher budget or clear the filters to see more plans.'
                : liveMode
                  ? 'Published plans from Fajify businesses will appear here when available.'
                  : 'Choose a budget range to narrow the plans.'}
            </p>
            {narrowed && onClearFilters && (
              <button className="faji-outline mt-5" onClick={onClearFilters}>Clear filters</button>
            )}
          </div>
        )}
        {!loading && filtered.map(plan => (
          <div key={plan.id} className="rounded-[20px] overflow-hidden"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex h-full flex-col">
              {plan.image
                ? <img src={plan.image} alt={plan.name} className="h-[190px] w-full shrink-0 object-cover" />
                : <div className="grid h-[150px] w-full shrink-0 place-items-center" aria-label={`${plan.category} plan`} style={{ background: dark ? 'linear-gradient(135deg,#291817,#3A2827)' : 'linear-gradient(135deg,#FFF1F0,#FFE0DE)' }}>
                    <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: dark ? '#FF807A' : '#C82924' }}>{plan.category}</span>
                  </div>}
              <div className="flex flex-col p-3.5 flex-1 min-w-0">
                <h2 className="text-[14px] font-black mb-2 leading-tight" style={{ color: ink }}>{plan.name}</h2>
                <div className="flex flex-col gap-0.5 mb-3 flex-1">
                  {plan.inclusions.map(inc => (
                    <p key={inc} className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: muted }}>
                      <span className="shrink-0">·</span><span>{inc}</span>
                    </p>
                  ))}
                </div>
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  {liveMode
                    ? <span className="text-xs" style={{ color: muted }}>{plan.minPeople ?? 1}–{plan.maxPeople} guests</span>
                    : <select
                        aria-label={`Guests for ${plan.name}`}
                        value={guests[plan.id] ?? '2 people'}
                        onChange={e => setGuests(g => ({ ...g, [plan.id]: e.target.value }))}
                        className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold outline-none"
                        style={{ background: bg, borderColor: border, color: ink, maxWidth: 100 }}>
                        {PEOPLE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>}
                  <span className="text-[15px] font-black" style={{ color: RED }}>{fmt(plan.price,plan.currency)}</span>
                </div>
                <button
                  onClick={() => {if(onBook){onBook(plan.id);return;}setPendingPlanId(plan.id);setCalOpen(true)}}
                  className="w-full rounded-full py-2 text-[13px] font-black text-white"
                  style={{ background: RED }}>
                  {liveMode ? 'View plan' : 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pagination}
      {!onBook && <CalendarSheet
        open={calOpen}
        onClose={() => { setCalOpen(false); setPendingPlanId(null) }}
        onConfirm={(date, time) => {
          if (pendingPlanId) navigate({ name: 'checkout', venueId: pendingPlanId, bookingDate: date, bookingTime: time })
          setCalOpen(false)
          setPendingPlanId(null)
        }}
        venueTimeType="default"
      />}
      <BottomNav active="home" navigate={navigate} />
    </div>
  )
}
