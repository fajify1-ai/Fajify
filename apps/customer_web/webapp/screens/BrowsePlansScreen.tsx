import { useState, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import CalendarSheet from '../components/CalendarSheet'
import BottomNav from '../components/BottomNav'

type BrowsePlan = {
  id:string
  name:string
  image:string
  inclusions:string[]
  price:number
  currency?:string
  minPeople?:number
  maxPeople:number
  category:string
  businessName?:string
  location?:string
}
type Props = {
  navigate: NavigateFn
  livePlans?: BrowsePlan[]
  onBook?: (id:string)=>void
  onPlanForMe?: ()=>void
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
  onPlanForMe,
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
    <div className="min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg, color: ink }}>
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3" style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '12px clamp(16px, 4vw, 64px)', justifyContent: 'flex-start' }}>
        <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:border-[#FA3F38]"
          style={{ background: bg, borderColor: border }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="m-0 text-lg font-extrabold tracking-tight md:text-xl" style={{ color: ink, fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.2 }}>Browse Plans</h1>
          <p className="m-0 mt-1 hidden text-xs sm:block" style={{ color: muted }}>Discover experiences and packages from Fajify businesses.</p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1440px] px-4 pt-5 md:px-10 md:pt-6 lg:px-16" aria-label="Plan filters">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm font-bold" style={{ color: ink }}>Find a plan for your budget</p>
          {onPlanForMe && (
            <button onClick={onPlanForMe} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold sm:inline-flex"
              style={{ color: RED, background: dark ? '#321918' : '#FFF1F0' }}>
              Need ideas? Plan for me
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2 [scrollbar-width:none] md:flex-wrap">
            {BUDGETS.map(b => {
            const active = activeBudget === b
            return (
              <button key={b} onClick={() => {setLocalBudget(b);onBudgetChange?.(b)}}
                aria-pressed={active}
                className="shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA3F38]"
                style={{ background: active ? RED : 'transparent', color: active ? '#fff' : RED, border: `1px solid ${RED}` }}>
                {b}
              </button>
            )
            })}
          </div>
          {filters}
        </div>
        {onPlanForMe && (
          <button onClick={onPlanForMe} className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold sm:hidden"
            style={{ color: RED, background: dark ? '#321918' : '#FFF1F0' }}>
            Need ideas? Plan for me <span aria-hidden="true">→</span>
          </button>
        )}
      </section>

      {/* Plan cards */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-4 md:px-10 md:pt-5 lg:px-16" aria-label="Available plans">
        {filtered.length > 0 && !loading && !error && (
          <p className="mb-3 text-xs" style={{ color: muted }}>
            {filtered.length}{plans.length === filtered.length && liveMode && plans.length === 20 ? '+' : ''} {filtered.length === 1 ? 'plan' : 'plans'}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <>
            <p className="sr-only" role="status" aria-live="polite">Loading available plans…</p>
            {[0,1,2].map(item=><div key={item} className="overflow-hidden rounded-[20px] border" aria-hidden="true" style={{ background: surface, borderColor: border }}>
              <div className="h-40 animate-pulse" style={{ background: dark ? '#292929' : '#EEEEEE' }} />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded" style={{ background: dark ? '#292929' : '#EEEEEE' }} />
                <div className="h-3 w-1/2 animate-pulse rounded" style={{ background: dark ? '#292929' : '#EEEEEE' }} />
                <div className="h-10 animate-pulse rounded-full" style={{ background: dark ? '#292929' : '#EEEEEE' }} />
              </div>
            </div>)}
          </>
        )}
        {!loading && error && (
          <div className="rounded-2xl border px-6 py-10 text-center sm:col-span-2 xl:col-span-3" role="alert" style={{ background: surface, borderColor: border }}>
            <p className="m-0 text-base font-bold" style={{ color: ink }}>We couldn’t load plans</p>
            <p className="mx-auto mb-0 mt-2 max-w-md text-sm" style={{ color: muted }}>{error}</p>
            {onRetry && <button className="mt-5 rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: RED }} onClick={onRetry}>Try again</button>}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="relative overflow-hidden rounded-[24px] border px-6 py-10 text-center sm:col-span-2 sm:px-10 sm:py-14 xl:col-span-3" style={{ background: surface, borderColor: border }}>
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-50" aria-hidden="true" style={{ background: dark ? 'radial-gradient(circle,#4A201D 0%,transparent 70%)' : 'radial-gradient(circle,#FFE0DE 0%,transparent 70%)' }} />
            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl" aria-hidden="true" style={{ background: dark ? '#321918' : '#FFF1F0', color: RED }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 12.2V21"/>
              </svg>
            </div>
            <p className="relative mb-0 mt-5 text-lg font-extrabold" style={{ color: ink }}>{narrowed ? 'No plans found for this budget' : 'No plans available just yet'}</p>
            <p className="relative mx-auto mb-0 mt-2 max-w-md text-sm" style={{ color: muted }}>
              {narrowed
                ? 'Try a higher budget or clear your filters. New packages from approved Fajify businesses appear here as they are published.'
                : liveMode
                  ? 'We’re preparing experiences from approved Fajify businesses. Check back soon, or let us help you plan something.'
                  : 'Choose a budget range to discover an experience that fits.'}
            </p>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
              {narrowed && onClearFilters && <button className="rounded-full border px-5 py-3 text-sm font-bold" style={{ background: 'transparent', borderColor: border, color: ink }} onClick={onClearFilters}>Clear filters</button>}
              {onPlanForMe && <button className="rounded-full px-5 py-3 text-sm font-bold text-white" style={{ background: RED }} onClick={onPlanForMe}>Plan for me</button>}
            </div>
          </div>
        )}
        {!loading && !error && filtered.map(plan => (
          <article key={plan.id} className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border transition-transform duration-200 hover:-translate-y-0.5"
            style={{ background: surface, borderColor: border }}>
              {plan.image
                ? <img src={plan.image} alt="" className="h-44 w-full shrink-0 object-cover" />
                : <div className="relative grid h-40 w-full shrink-0 place-items-center overflow-hidden" aria-hidden="true" style={{ background: dark ? 'linear-gradient(130deg,#291817,#3A2827 55%,#242020)' : 'linear-gradient(130deg,#FFF1F0,#FFE0DE 55%,#F5E9E8)' }}>
                    <span className="absolute -right-5 -top-12 h-36 w-36 rounded-full border opacity-40" style={{ borderColor: dark ? '#FF807A' : '#C82924' }} />
                    <span className="absolute -bottom-16 -left-7 h-40 w-40 rounded-full border opacity-30" style={{ borderColor: dark ? '#FF807A' : '#C82924' }} />
                    <span className="relative rounded-full border px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ background: dark ? '#1C1C1Caa' : '#ffffffb3', borderColor: dark ? '#583331' : '#FFD0CD', color: dark ? '#FF807A' : '#C82924' }}>{plan.category}</span>
                  </div>}
              <div className="flex min-h-[220px] flex-1 flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="m-0 text-base font-extrabold leading-snug" style={{ color: ink, fontSize: 16, fontWeight: 800, margin: 0 }}>{plan.name}</h2>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: dark ? '#292929' : '#F4F4F4', color: muted }}>{plan.category}</span>
                </div>
                {plan.businessName && <p className="m-0 text-xs font-semibold" style={{ color: muted }}>{plan.businessName}{plan.location ? ` · ${plan.location}` : ''}</p>}
                <div className="mb-4 mt-3 flex flex-1 flex-col gap-1">
                  {plan.inclusions.map(inc => (
                    <p key={inc} className="m-0 flex items-start gap-2 text-xs leading-relaxed" style={{ color: muted }}>
                      <span className="mt-0.5 shrink-0 font-bold" style={{ color: RED }}>✓</span><span>{inc}</span>
                    </p>
                  ))}
                </div>
                <div className="mb-3 flex items-end justify-between gap-2 border-t pt-3" style={{ borderColor: border }}>
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
                  <span className="text-base font-extrabold" style={{ color: RED }}>{fmt(plan.price,plan.currency)}</span>
                </div>
                <button
                  onClick={() => {if(onBook){onBook(plan.id);return;}setPendingPlanId(plan.id);setCalOpen(true)}}
                  className="w-full rounded-full py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#D92D27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA3F38]"
                  style={{ background: RED }}>
                  {liveMode ? 'View details' : 'Book Now'}
                </button>
              </div>
          </article>
        ))}
        </div>
      </section>

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
