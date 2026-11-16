import { useState } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import CalendarSheet from '../components/CalendarSheet'
import { useDarkMode } from '../store/darkMode'

export type PlanningAnswers = { occasion:string; guests:number; location:string; budget:string; date:string; time:string; vibes:string[] }
type Props = { navigate: NavigateFn; recommend?: (answers:PlanningAnswers)=>Promise<typeof PLANS>; onBook?: (id:string)=>void }

const RED = '#D92D27'

// ── SVG icons ────────────────────────────────────────────────────────────────
function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function Plus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function Minus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  )
}
function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? RED : 'none'} stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
function MapPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function Users() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function Search() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  )
}
// ── Emoji maps ────────────────────────────────────────────────────────────────
const OCCASION_EMOJI: Record<string, string> = {
  'Date':             '💑',
  'Birthday':         '🎂',
  'Friends Hangout':  '🥂',
  'Work / Corporate': '💼',
  'Family Time':      '👨‍👩‍👧',
  'Just Vibes':       '✨',
}

const VIBE_EMOJI: Record<string, string> = {
  'Chill':        '😌',
  'Romantic':     '🌹',
  'Fun':          '🎉',
  'Lively':       '⚡',
  'Classy':       '🥂',
  'Adventurous':  '🏕️',
  'Casual':       '👟',
}

// ── data ──────────────────────────────────────────────────────────────────────
const OCCASIONS = ['Date', 'Birthday', 'Friends Hangout', 'Work / Corporate', 'Family Time', 'Just Vibes']
const LOCATION_CHIPS = ['Lekki', 'Victoria Island', 'Ikeja', 'Yaba', 'Surulere']
const OTHER_LOCATIONS = ['Ajah', 'Ikoyi', 'Apapa', 'Gbagada', 'Ojodu', 'Magodo', 'Maryland', 'Oshodi', 'Agege', 'Isale Eko', 'Badagry', 'Epe']
const BUDGETS = [
  { label: 'Under ₦20k', sub: 'Great value picks' },
  { label: '₦20k – ₦50k', sub: 'Popular range' },
  { label: '₦50k – ₦100k', sub: 'Mid-range comfort' },
  { label: '₦100k – ₦200k', sub: 'Premium experiences' },
  { label: '₦200k+', sub: 'Ultra-luxury' },
]
const DATE_OPTS = ['Today', 'Tomorrow', 'This Weekend', 'Choose a date']
const TIME_OPTS = ['Morning', 'Afternoon', 'Evening', 'Night']
const VIBES = ['Chill', 'Romantic', 'Fun', 'Lively', 'Classy', 'Adventurous', 'Casual']
const PERSON_CHIPS = ['1–2', '3–5', '6–10', '11–20', '20+']

const PLANS = [
  {
    id: 'p1',
    name: 'Rooftop Hangout',
    location: 'Lekki',
    desc: 'Dinner · Drinks · Music',
    people: 'Up to 10',
    price: '₦65,000',
    image: '/reference/2bbb2979d689daf9.jpg',
    tag: 'Best Match',
  },
  {
    id: 'p2',
    name: 'Garden Brunch',
    location: 'Victoria Island',
    desc: 'Brunch · Live DJ · Poolside',
    people: 'Up to 8',
    price: '₦38,000',
    image: '/reference/7d48e15858ec35f1.jpg',
    tag: 'Spend Less',
  },
  {
    id: 'p3',
    name: 'Sky Lounge Experience',
    location: 'Ikoyi',
    desc: 'Fine Dining · Cocktails · Skyline View',
    people: 'Up to 12',
    price: '₦145,000',
    image: '/reference/1ebce746a344add1.jpg',
    tag: 'Stretch',
  },
  {
    id: 'p4',
    name: 'Island Social Club',
    location: 'Victoria Island',
    desc: 'Cocktails · Networking · Terrace',
    people: 'Up to 15',
    price: '₦72,000',
    image: '/reference/85e88e59ffe36d6c.jpg',
    tag: 'More',
  },
  {
    id: 'p5',
    name: 'Birthday Bash Package',
    location: 'Ikeja',
    desc: 'Private Room · Cake · Open Bar',
    people: 'Up to 20',
    price: '₦90,000',
    image: '/reference/3e0ee8c0e757af51.jpg',
    tag: 'More',
  },
  {
    id: 'p6',
    name: 'Chill & Grill Evening',
    location: 'Lekki',
    desc: 'BBQ · Live Music · Outdoor',
    people: 'Up to 6',
    price: '₦42,000',
    image: '/reference/0531c25c4616a02b.jpg',
    tag: 'More',
  },
]

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step, total, dark }: { step: number; total: number; dark: boolean }) {
  return (
    <div className="flex gap-1.5 px-5 pt-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
          style={{ background: i < step ? RED : dark ? '#2A2A2A' : '#EEE' }} />
      ))}
    </div>
  )
}

// ── Primary button ────────────────────────────────────────────────────────────
function PrimaryBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full rounded-2xl py-4 text-[16px] font-bold text-white transition-opacity"
      style={{ background: disabled ? '#FFADA9' : RED }}>
      {label}
    </button>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onBook, dark }: { plan: typeof PLANS[0]; onBook: () => void; dark: boolean }) {
  const [loved, setLoved] = useState(false)
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#888'
  return (
    <article className="overflow-hidden rounded-[20px] shadow-[0_6px_24px_rgba(50,20,20,.08)]"
      style={{ background: surface }}>
      <div className="relative">
        <img src={plan.image} alt={plan.name} className="h-[190px] w-full object-cover" />
        <button onClick={() => setLoved(l => !l)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md"
          style={{ background: surface }}>
          <HeartIcon filled={loved} />
        </button>
        {plan.tag && (
          <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-white"
            style={{ background: plan.tag === 'Best Match' ? RED : plan.tag === 'Spend Less' ? '#22b969' : plan.tag === 'Stretch' ? '#7c3aed' : '#555' }}>
            {plan.tag === 'Best Match' ? '★ Best Match' : plan.tag === 'Spend Less' ? '↓ Spend Less' : plan.tag === 'Stretch' ? '↑ Worth It' : 'More'}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[17px] font-bold" style={{ color: ink }}>{plan.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-[12px]" style={{ color: muted }}>
              <MapPin />{plan.location}
            </p>
          </div>
          <span className="text-[18px] font-black" style={{ color: RED }}>{plan.price}</span>
        </div>
        <p className="mt-2 text-[13px]" style={{ color: muted }}>{plan.desc}</p>
        <div className="mt-1 flex items-center gap-1 text-[12px]" style={{ color: muted }}>
          <Users />{plan.people}
        </div>
        <button onClick={onBook}
          className="mt-3 w-full rounded-xl py-3 text-[14px] font-bold text-white transition-opacity active:opacity-80"
          style={{ background: RED }}>
          Book Now →
        </button>
      </div>
    </article>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PlanForMeScreen({ navigate, recommend, onBook }: Props) {
  const { dark } = useDarkMode()
  const bg       = dark ? '#0F0F0F' : '#F8F8F8'
  const surface  = dark ? '#1C1C1C' : '#FFFFFF'
  const ink      = dark ? '#F0F0F0' : '#1A1A1A'
  const muted    = dark ? '#AAA' : '#6B6666'
  const sub      = dark ? '#AAA' : '#6B6666'
  const border   = dark ? '#2A2A2A' : '#F0EDED'
  const cardBg   = dark ? '#1A1A1A' : '#FAFAFA'
  const lightRed = dark ? '#2A1010' : '#FFF1F0'
  const inputBg  = dark ? '#252525' : '#FFFFFF'
  const [step, setStep] = useState(1)
  const [livePlans, setLivePlans] = useState<typeof PLANS>([])
  const [requestError, setRequestError] = useState('')
  const [busy, setBusy] = useState(false)
  const TOTAL_STEPS = 6

  // State for each step
  const [occasion, setOccasion] = useState('')
  const [guestCount, setGuestCount] = useState(6)
  const [guestChip, setGuestChip] = useState('')
  const [location, setLocation] = useState('')
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [budget, setBudget] = useState('')
  const [budgetFlex, setBudgetFlex] = useState(false)
  const [dateChoice, setDateChoice] = useState('')
  const [timeChoice, setTimeChoice] = useState('Evening')
  const [vibes, setVibes] = useState<string[]>([])
  const [calOpen, setCalOpen] = useState(false)
  const [bookingCalOpen, setBookingCalOpen] = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)

  const goBack = () => {
    if (step === 1) navigate({ name: 'home' })
    else setStep(s => s - 1)
  }

  const toggleVibe = (v: string) =>
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const filteredOther = OTHER_LOCATIONS.filter(l =>
    l.toLowerCase().includes(locationQuery.toLowerCase())
  )

  // Results screen
  if (step === 7) {
    const summaryParts = [
      guestCount + ' people',
      location,
      dateChoice,
      timeChoice,
      budget || 'Any budget',
      vibes.join(' + ') || 'Any vibe',
    ].filter(Boolean)

    const best = (recommend ? livePlans : PLANS).filter(p => p.tag === 'Best Match')
    const less = (recommend ? livePlans : PLANS).filter(p => p.tag === 'Spend Less')
    const stretch = (recommend ? livePlans : PLANS).filter(p => p.tag === 'Stretch')
    const more = (recommend ? livePlans : PLANS).filter(p => p.tag === 'More')

    return (
      <main className="min-h-screen w-full pb-32 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>
        {/* Hero */}
        <div className="sticky top-0 z-10 px-5 pt-14 pb-6 md:px-10 md:pt-8 lg:px-16"
          style={{ background: dark ? 'linear-gradient(160deg,#1C1C1C 0%,#2A1010 100%)' : 'linear-gradient(160deg,#fff 0%,#FFF4F3 100%)' }}>
          <div className="flex items-center gap-2 mb-4">
            <button aria-label="Go back" onClick={goBack} style={{ color: muted }}><ChevronLeft /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">{recommend && !livePlans.length ? '🔎' : '🎉'}</span>
            <h1 className="text-[26px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>
              {recommend && !livePlans.length ? <>No matching plans<br />yet</> : <>We found some plans<br />for you!</>}
            </h1>
          </div>
          <p className="mt-1 text-[14px]" style={{ color: muted }}>{recommend && !livePlans.length ? 'Try another date, location or budget.' : 'Based on what you picked, here are your best matches.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {summaryParts.map((part, i) => (
              <span key={i} className="rounded-full px-3 py-1 text-[12px] font-semibold text-white" style={{ background: RED }}>
                {part}
              </span>
            ))}
          </div>
        </div>

        {recommend && !livePlans.length && <p role="status" className="px-5 py-8">No plans match these preferences. Go back to adjust them.</p>}
        <div className="grid w-full grid-cols-1 gap-6 px-5 mt-2 md:px-10 lg:px-16">
          {best.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-black uppercase tracking-widest" style={{ color: RED }}>Best Match For You</h2>
              {best.map(p => <PlanCard key={p.id} plan={p} dark={dark} onBook={() => { onBook ? onBook(p.id) : (setPendingPlanId(p.id), setBookingCalOpen(true)) }} />)}
            </section>
          )}
          {less.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-black uppercase tracking-widest text-[#22b969]">You Could Spend Less</h2>
              {less.map(p => <PlanCard key={p.id} plan={p} dark={dark} onBook={() => { onBook ? onBook(p.id) : (setPendingPlanId(p.id), setBookingCalOpen(true)) }} />)}
            </section>
          )}
          {stretch.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-black uppercase tracking-widest text-[#7c3aed]">Worth Stretching For</h2>
              {stretch.map(p => <PlanCard key={p.id} plan={p} dark={dark} onBook={() => { onBook ? onBook(p.id) : (setPendingPlanId(p.id), setBookingCalOpen(true)) }} />)}
            </section>
          )}
          {more.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-black uppercase tracking-widest" style={{ color: muted }}>More Options</h2>
              <div className="grid grid-cols-1 gap-4">
                {more.map(p => <PlanCard key={p.id} plan={p} dark={dark} onBook={() => { onBook ? onBook(p.id) : (setPendingPlanId(p.id), setBookingCalOpen(true)) }} />)}
              </div>
            </section>
          )}
        </div>

        <BottomNav active="home" navigate={navigate} />
        <CalendarSheet
          open={bookingCalOpen}
          onClose={() => { setBookingCalOpen(false); setPendingPlanId(null) }}
          onConfirm={(date, time) => {
            if (pendingPlanId) navigate({ name: 'checkout', venueId: pendingPlanId, bookingDate: date, bookingTime: time })
            setBookingCalOpen(false)
            setPendingPlanId(null)
          }}
          venueTimeType="default"
        />
      </main>
    )
  }

  return (
    <>
    <main className="min-h-screen w-full flex flex-col font-[family-name:var(--font-ui)] md:pl-24" style={{ background: surface, borderColor: border }}>
      {/* Top bar */}
      <div className="pt-12 pb-2 md:pt-8">
        <div className="flex items-center gap-3 px-5 md:px-10 lg:px-16">
          <button aria-label="Go back" onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ color: muted, borderColor: border }}>
            <ChevronLeft />
          </button>
          <span className="text-[13px] font-semibold" style={{ color: muted }}>Step {step} of {TOTAL_STEPS}</span>
        </div>
        <ProgressBar step={step} total={TOTAL_STEPS} dark={dark} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 [scrollbar-width:none] md:px-10 md:pt-8 lg:px-16">

        {/* ── Step 1: Occasion ── */}
        {step === 1 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>What are you<br />planning?</h1>
            <p className="mt-1 mb-6 text-[15px]" style={{ color: muted }}>Pick what feels right.</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {OCCASIONS.map(occ => {
                const active = occasion === occ
                return (
                  <button key={occ} onClick={() => setOccasion(occ)}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all"
                    style={{ borderColor: active ? RED : border, background: active ? lightRed : cardBg }}>
                    <span className="text-[34px] leading-none">{OCCASION_EMOJI[occ] ?? '✨'}</span>
                    <span className="text-[14px] font-bold text-center" style={{ color: active ? RED : ink }}>{occ}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Guests ── */}
        {step === 2 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>How many people<br />are coming?</h1>
            <p className="mt-1 mb-8 text-[15px]" style={{ color: muted }}>No typing needed.</p>

            <div className="flex items-center justify-center gap-8 py-6 mb-8 rounded-2xl" style={{ background: lightRed }}>
              <button onClick={() => { setGuestCount(n => Math.max(1, n - 1)); setGuestChip('') }}
                className="flex h-14 w-14 items-center justify-center rounded-full shadow-md"
                style={{ background: surface, color: muted }}>
                <Minus />
              </button>
              <div className="text-center">
                <span className="text-[60px] font-black leading-none" style={{ color: RED }}>{guestCount}</span>
                <p className="text-[13px] mt-1" style={{ color: muted }}>people</p>
              </div>
              <button onClick={() => { setGuestCount(n => n + 1); setGuestChip('') }}
                className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md"
                style={{ background: RED }}>
                <Plus />
              </button>
            </div>

            <p className="text-[13px] font-semibold mb-3 uppercase tracking-wider" style={{ color: sub }}>Or pick a range</p>
            <div className="flex flex-wrap gap-2">
              {PERSON_CHIPS.map(chip => {
                const active = guestChip === chip
                return (
                  <button key={chip}
                    onClick={() => {
                      setGuestChip(chip)
                      const mid: Record<string, number> = { '1–2': 2, '3–5': 4, '6–10': 8, '11–20': 15, '20+': 25 }
                      setGuestCount(mid[chip] ?? 6)
                    }}
                    className="rounded-full px-5 py-2.5 text-[14px] font-bold border-2 transition-all"
                    style={{
                      borderColor: active ? RED : border,
                      background: active ? RED : cardBg,
                      color: active ? '#fff' : ink,
                    }}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Location ── */}
        {step === 3 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>Where do you<br />want to go?</h1>
            <p className="mt-1 mb-6 text-[15px]" style={{ color: muted }}>Choose a place that works for you.</p>
            <div className="flex flex-col gap-3 mb-4">
              {LOCATION_CHIPS.map(loc => {
                const active = location === loc
                return (
                  <button key={loc} onClick={() => { setLocation(loc); setShowLocationSearch(false) }}
                    className="flex items-center gap-3 rounded-2xl border-2 px-5 py-4 transition-all"
                    style={{ borderColor: active ? RED : border, background: active ? lightRed : cardBg }}>
                    <span style={{ color: active ? RED : sub }}><MapPin /></span>
                    <span className="text-[16px] font-bold" style={{ color: active ? RED : ink }}>{loc}</span>
                    {active && <span className="ml-auto text-[12px] font-bold" style={{ color: RED }}>✓</span>}
                  </button>
                )
              })}
              <button onClick={() => setShowLocationSearch(!showLocationSearch)}
                className="flex items-center gap-3 rounded-2xl border-2 px-5 py-4 transition-all"
                style={{ borderColor: showLocationSearch ? RED : border, background: showLocationSearch ? lightRed : cardBg }}>
                <span style={{ color: showLocationSearch ? RED : sub }}><Search /></span>
                <span className="text-[15px] font-bold" style={{ color: ink }}>Choose another location</span>
              </button>
            </div>
            {showLocationSearch && (
              <div className="rounded-2xl p-4" style={{ border: `1px solid ${border}`, background: cardBg }}>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2"><Search /></span>
                  <input value={locationQuery} onChange={e => setLocationQuery(e.target.value)}
                    placeholder="Search location..."
                    className="w-full rounded-xl border py-3 pl-10 pr-4 text-[14px] outline-none"
                    style={{ background: inputBg, borderColor: border, color: ink }} />
                </div>
                <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto [scrollbar-width:none]">
                  {filteredOther.map(loc => {
                    const active = location === loc
                    return (
                      <button key={loc}
                        onClick={() => { setLocation(loc); setShowLocationSearch(false); setLocationQuery('') }}
                        className="rounded-full px-4 py-2 text-[13px] font-semibold border transition-all"
                        style={{ borderColor: active ? RED : border, background: active ? RED : inputBg, color: active ? 'white' : ink }}>
                        {loc}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Budget ── */}
        {step === 4 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>What feels<br />comfortable?</h1>
            <p className="mt-1 mb-6 text-[15px]" style={{ color: muted }}>{"We'll find options around your range."}</p>
            <div className="flex flex-col gap-3 mb-3">
              {BUDGETS.map(b => {
                const active = budget === b.label && !budgetFlex
                return (
                  <button key={b.label} onClick={() => { setBudget(b.label); setBudgetFlex(false) }}
                    className="flex items-center justify-between rounded-2xl border-2 px-5 py-4 transition-all"
                    style={{ borderColor: active ? RED : border, background: active ? lightRed : cardBg }}>
                    <div className="text-left">
                      <p className="text-[16px] font-bold" style={{ color: active ? RED : ink }}>{b.label}</p>
                      <p className="text-[12px]" style={{ color: sub }}>{b.sub}</p>
                    </div>
                    {active && <span className="text-[18px]" style={{ color: RED }}>✓</span>}
                  </button>
                )
              })}
              <button onClick={() => { setBudgetFlex(true); setBudget('') }}
                className="flex flex-col rounded-2xl border-2 px-5 py-4 transition-all text-left"
                style={{ borderColor: budgetFlex ? RED : border, background: budgetFlex ? lightRed : cardBg }}>
                <span className="text-[15px] font-black" style={{ color: budgetFlex ? RED : ink }}>Not sure?</span>
                <span className="text-[13px]" style={{ color: muted }}>Show me options across different budgets</span>
              </button>
            </div>
            <p className="text-[12px] text-center" style={{ color: sub }}>Your budget is a preference, not a hard limit.</p>
          </div>
        )}

        {/* ── Step 5: Date & Time ── */}
        {step === 5 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>When are<br />you going?</h1>
            <p className="mt-1 mb-6 text-[15px]" style={{ color: muted }}>Pick a date and time.</p>
            <p className="text-[13px] font-semibold mb-3 uppercase tracking-wider" style={{ color: sub }}>Date</p>
            {(() => {
              const isCalendarDate = dateChoice && !['Today','Tomorrow','This Weekend'].includes(dateChoice)
              const nowHour = new Date().getHours()
              const timeDisabled = (t: string) => {
                if (dateChoice !== 'Today') return false
                if (t === 'Morning') return nowHour >= 12
                if (t === 'Afternoon') return nowHour >= 16
                if (t === 'Evening') return nowHour >= 21
                return false
              }
              return (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {DATE_OPTS.map(d => {
                      const isChoose = d === 'Choose a date'
                      const active = isChoose ? !!isCalendarDate : dateChoice === d
                      return (
                        <button key={d}
                          onClick={() => { if (isChoose) { setCalOpen(true) } else setDateChoice(d) }}
                          className="rounded-2xl border-2 py-4 text-[15px] font-bold transition-all"
                          style={{ borderColor: active ? RED : border, background: active ? lightRed : cardBg, color: active ? RED : ink }}>
                          {isChoose ? (isCalendarDate ? dateChoice : '📅 Choose a date') : d}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[13px] font-semibold mb-3 uppercase tracking-wider" style={{ color: sub }}>Time of day</p>
                  <div className="flex rounded-2xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                    {TIME_OPTS.map((t, i) => {
                      const active = timeChoice === t
                      const disabled = timeDisabled(t)
                      return (
                        <button key={t} onClick={() => { if (!disabled) setTimeChoice(t) }}
                          className="flex-1 py-4 text-[13px] font-bold transition-all"
                          style={{
                            background: disabled ? (dark ? '#252525' : '#F5F5F5') : active ? RED : cardBg,
                            color: disabled ? (dark ? '#444' : '#CCC') : active ? 'white' : ink,
                            borderRight: i < TIME_OPTS.length - 1 ? `1px solid ${border}` : 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            textDecoration: disabled ? 'line-through' : 'none',
                          }}>
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            })()}
            <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl" style={{ background: lightRed }}>
              <span className="text-xl">
                {timeChoice === 'Morning' ? '🌅' : timeChoice === 'Afternoon' ? '☀️' : timeChoice === 'Evening' ? '🌆' : '🌙'}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: RED }}>
                {timeChoice === 'Morning' ? '6am – 12pm' : timeChoice === 'Afternoon' ? '12pm – 4pm' : timeChoice === 'Evening' ? '4pm – 9pm' : '9pm – late'}
              </span>
            </div>
          </div>
        )}

        {/* ── Step 6: Vibe ── */}
        {step === 6 && (
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight" style={{ color: ink }}>{"What's the vibe?"}</h1>
            <p className="mt-1 mb-6 text-[15px]" style={{ color: muted }}>{"Pick what you're feeling. Choose as many as you like."}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {VIBES.map(v => {
                const active = vibes.includes(v)
                return (
                  <button key={v} onClick={() => toggleVibe(v)}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 py-5 px-3 transition-all"
                    style={{ borderColor: active ? RED : border, background: active ? lightRed : cardBg }}>
                    <span className="text-[30px] leading-none">{VIBE_EMOJI[v] ?? '✨'}</span>
                    <span className="text-[14px] font-bold" style={{ color: active ? RED : ink }}>{v}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

      </div>

      {requestError && <p role="alert" className="px-5 py-4 text-red-700">{requestError}</p>}
      {/* Bottom CTA */}
      <div className="px-5 pb-10 pt-3 md:px-10 lg:px-16" style={{ borderTop: `1px solid ${border}`, background: surface }}>
        {step < 6 && (
          <PrimaryBtn
            label="Continue"
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 1 && !occasion) ||
              (step === 3 && !location) ||
              (step === 4 && !budget && !budgetFlex) ||
              (step === 5 && !dateChoice)
            }
          />
        )}
        {step === 6 && (
          <PrimaryBtn
            label={busy ? 'Finding plans…' : 'Show My Plans →'}
            onClick={async () => { if (!recommend) { setStep(7); return } setBusy(true); setRequestError(''); try { setLivePlans(await recommend({occasion, guests:guestCount, location, budget, date:dateChoice, time:timeChoice, vibes})); setStep(7) } catch(e) { setRequestError(e instanceof Error ? e.message : 'Planning unavailable') } finally { setBusy(false) } }}
            disabled={vibes.length === 0 || busy}
          />
        )}
        {step > 1 && (
          <button aria-label="Go back" onClick={goBack} className="mt-3 w-full py-3 text-[14px] font-semibold" style={{ color: sub }}>
            ← Go back
          </button>
        )}
      </div>
    </main>

    <CalendarSheet
      open={calOpen}
      onClose={() => setCalOpen(false)}
      dateOnly
      onConfirm={(date) => {
        setDateChoice(date)
        setCalOpen(false)
      }}
    />
    </>
  )
}
