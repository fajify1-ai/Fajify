import { Button } from '../../components/ui/button'
import { upcomingEvents } from '../data'
import { useState, useEffect, useRef } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconBell, IconSearch, IconFilter, IconHeart, IconStar, IconMapPin } from '../components/Icons'
import { useSaved } from '../store/saved'
import { useDarkMode } from '../store/darkMode'

type Props = { navigate: NavigateFn; onVendorSwitch?: () => void; initialSearch?: string; venues?: typeof allVenues; live?: boolean; categoryOptions?: string[]; onQuery?: (query: string, category: string) => void }

const RED = '#FA3F38'

// ── Billboard items — mixed content like you'd see on a city billboard ────────
const billboardItems = [
  {
    id: 'bb1',
    label: 'NOW IN CINEMAS',
    title: 'Deadpool & Wolverine',
    sub: 'Book tickets from ₦3,500',
    color: '#1a0a0a',
    image: '/reference/04b428addfc19549.jpg',
    badge: '🎬 Movie',
    cta: 'Book Tickets',
    dest: { name: 'restaurant' as const, id: 'v3' },
  },
  {
    id: 'bb2',
    label: 'FREE · THIS WEEKEND',
    title: 'Art Lagos Festival',
    sub: 'Balmoral Convention Centre',
    color: '#0a1a0a',
    image: '/reference/9b03a4cf093c3541.jpg',
    badge: '🎪 Event',
    cta: 'Get Free Pass',
    dest: { name: 'eventDetail' as const, id: 'bb2' },
  },
  {
    id: 'bb3',
    label: '50% OFF · TODAY ONLY',
    title: 'Dinner at Nok by Alara',
    sub: 'Ikoyi · Use code FAJIFY50',
    color: '#1a100a',
    image: '/reference/ec7238b7cf1876f2.jpg',
    badge: '🏷️ Offer',
    cta: 'Claim Offer',
    dest: { name: 'restaurant' as const, id: 'v10' },
  },
  {
    id: 'bb4',
    label: 'JUST OPENED',
    title: 'Sky Bar Lagos',
    sub: 'Victoria Island · Rooftop',
    color: '#0a0a1a',
    image: '/reference/5610e495355ad5a2.jpg',
    badge: '✨ New Venue',
    cta: 'Reserve a Spot',
    dest: { name: 'restaurant' as const, id: 'v6' },
  },
  {
    id: 'bb5',
    label: 'NOW SHOWING',
    title: 'Filmhouse Lekki',
    sub: '8 screens · Lekki Phase 1',
    color: '#150a1a',
    image: '/reference/eb233bf152443ce4.jpg',
    badge: '🎥 Cinema',
    cta: 'Pick a Showtime',
    dest: { name: 'restaurant' as const, id: 'v3' },
  },
  {
    id: 'bb6',
    label: 'TOMORROW NIGHT',
    title: 'Ilashe Beach Party',
    sub: 'Lagos Island · ₦15,000',
    color: '#1a1200',
    image: '/reference/35b1b4feb4f8289d.jpg',
    badge: '🎉 Event',
    cta: 'Get Tickets',
    dest: { name: 'eventDetail' as const, id: 'bb6' },
  },
]

// ── Category pills ────────────────────────────────────────────────────────────
const categories = ['All', 'Restaurant', 'Beach', 'Cinema', 'Park', 'Bar', 'Club', 'Outdoor']

// ── Venues (vertical list, filterable) ───────────────────────────────────────
const allVenues = [
  { id: 'v1', name: 'Shiro Lagos', cat: 'Restaurant', location: 'Victoria Island', tag: 'Fine Dining', rating: 4.8, price: '₦25,000+', open: true, image: '/reference/ec7238b7cf1876f2.jpg' },
  { id: 'v2', name: 'Landmark Beach', cat: 'Beach', location: 'Lekki', tag: 'Beach', rating: 4.7, price: '₦5,000+', open: true, image: '/reference/d2809f966c87657b.jpg' },
  { id: 'v3', name: 'Filmhouse Cinemas', cat: 'Cinema', location: 'Lekki Phase 1', tag: 'Cinema', rating: 4.6, price: '₦3,500+', open: true, image: '/reference/eb233bf152443ce4.jpg' },
  { id: 'v4', name: 'Muri Okunola Park', cat: 'Park', location: 'Victoria Island', tag: 'Outdoor', rating: 4.5, price: 'Free', open: true, image: '/reference/64c4d36a367c9854.jpg' },
  { id: 'v5', name: 'Nok by Alara', cat: 'Restaurant', location: 'Ikoyi', tag: 'Rooftop', rating: 4.9, price: '₦30,000+', open: true, image: '/reference/80eb2da0b5b9f74e.jpg' },
  { id: 'v6', name: 'Hard Rock Cafe', cat: 'Bar', location: 'Oniru Estate', tag: 'Bar & Grill', rating: 4.6, price: '₦15,000+', open: false, image: '/reference/e8d286b51917963c.jpg' },
  { id: 'v7', name: 'Silverbird Cinemas', cat: 'Cinema', location: 'Ikeja City Mall', tag: 'Cinema', rating: 4.5, price: '₦3,000+', open: true, image: '/reference/3b94e740152b2363.jpg' },
  { id: 'v8', name: 'Ilashe Beach Resort', cat: 'Beach', location: 'Lagos Island', tag: 'Resort', rating: 4.9, price: '₦45,000', open: true, image: '/reference/3ca782c50b8d5873.jpg' },
  { id: 'v9', name: 'The Island Club', cat: 'Club', location: 'Ikoyi', tag: 'Exclusive', rating: 4.8, price: '₦60,000+', open: false, image: '/reference/087c5147f273074e.jpg' },
  { id: 'v10', name: 'Sky Bar Lagos', cat: 'Bar', location: 'Victoria Island', tag: 'Rooftop', rating: 4.7, price: '₦20,000+', open: true, image: '/reference/5610e495355ad5a2.jpg' },
  { id: 'dominos', name: "Domino's Pizza", cat: 'Restaurant', location: 'Surulere', tag: 'Delivery', rating: 4.8, price: '₦2,000+', open: true, image: '/reference/061b6b3dee2d370c.jpg' },
]

// ── Filter config ─────────────────────────────────────────────────────────────
const F_LOCATIONS = ['Lekki', 'Victoria Island', 'Ikeja', 'Ikoyi', 'Yaba', 'Surulere']
const F_BUDGETS = ['Under ₦10k', '₦10k–₦30k', '₦30k–₦60k', '₦60k–₦100k', '₦100k+']
const F_RATINGS = ['4.5+', '4.0+', '3.5+', 'Any']

function FilterSheet({ onClose, dark }: { onClose: () => void; dark: boolean }) {
  const bg = dark ? '#1C1C1C' : '#fff'
  const text = dark ? '#F0F0F0' : '#1a1a1a'
  const muted = dark ? '#888' : '#aaa'
  const chipBg = dark ? '#2A2A2A' : '#FAFAFA'
  const chipBorder = dark ? '#3A3A3A' : '#EEE'

  const [locs, setLocs] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [rating, setRating] = useState('Any')

  const toggleLoc = (l: string) => setLocs(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])
  const clear = () => { setLocs([]); setBudget(''); setRating('Any') }

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <button onClick={onPress}
      className="rounded-full border-2 px-4 py-2 text-[13px] font-semibold transition-all"
      style={{ borderColor: active ? RED : chipBorder, background: active ? RED : chipBg, color: active ? '#fff' : text }}>
      {label}
    </button>
  )

  return (
    <>
      <button aria-label="Close" onClick={onClose} className="fixed inset-0 z-[100] bg-black/40" />
      <div className="fixed bottom-0 left-1/2 z-[110] w-full max-w-[430px] -translate-x-1/2 rounded-t-[28px] pb-10 shadow-[0_-8px_40px_rgba(0,0,0,.2)] md:bottom-1/2 md:max-w-[600px] md:translate-y-1/2 md:rounded-[28px]" style={{ background: bg }}>
        <div className="flex justify-center pt-3 pb-4">
          <div className="h-1 w-10 rounded-full" style={{ background: chipBorder }} />
        </div>
        <div className="flex items-center justify-between px-5 mb-5">
          <h2 className="text-[20px] font-black" style={{ color: text }}>Filter</h2>
          <button onClick={clear} className="text-[13px] font-semibold" style={{ color: RED }}>Clear all</button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-5 flex flex-col gap-6 [scrollbar-width:none]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>Location</p>
            <div className="flex flex-wrap gap-2">
              {F_LOCATIONS.map(l => <Chip key={l} label={l} active={locs.includes(l)} onPress={() => toggleLoc(l)} />)}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>Budget</p>
            <div className="flex flex-wrap gap-2">
              {F_BUDGETS.map(b => <Chip key={b} label={b} active={budget === b} onPress={() => setBudget(budget === b ? '' : b)} />)}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: muted }}>Rating</p>
            <div className="flex gap-2">
              {F_RATINGS.map(r => <Chip key={r} label={r === 'Any' ? r : `⭐ ${r}`} active={rating === r} onPress={() => setRating(r)} />)}
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          <button aria-label="Close" onClick={onClose} className="w-full rounded-2xl py-4 text-[16px] font-black text-white" style={{ background: RED }}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}

// ── Save button ───────────────────────────────────────────────────────────────
function SaveBtn({ id }: { id: string }) {
  const { isSaved, toggle } = useSaved()
  return (
    <button onClick={e => { e.stopPropagation(); toggle(id) }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md"
      aria-label="Save">
      <IconHeart size={16} color={RED} filled={isSaved(id)} />
    </button>
  )
}

// ── Hero banner carousel ──────────────────────────────────────────────────────
const BANNERS = [
  {
    eyebrow: 'Limited spots tonight',
    title: 'Get 20% off your\nnext reservation',
    cta: 'Claim Offer',
    accent: '#FA3F38',
    img: '/reference/55e758dc75a99e03.jpg',
    dest: { name: 'offers' as const },
  },
  {
    eyebrow: '12 rooftops available now',
    title: 'Book a table with\nthe best city views',
    cta: 'Browse Rooftops',
    accent: '#F97316',
    img: '/reference/44be68d8b29c5eb3.jpg',
    dest: { name: 'restaurant' as const, id: 'v1' },
  },
  {
    eyebrow: 'This weekend · Lekki & VI',
    title: 'Beach clubs open —\npasses from ₦5,000',
    cta: 'Get Day Pass',
    accent: '#0EA5E9',
    img: '/reference/2da1b647eb29032e.jpg',
    dest: { name: 'restaurant' as const, id: 'v2' },
  },
  {
    eyebrow: 'New on fajify',
    title: 'Plan your night out\nin under 2 minutes',
    cta: 'Plan For Me →',
    accent: '#A855F7',
    img: '/reference/990843d5300e027f.jpg',
    dest: { name: 'planForMe' as const },
  },
]

function HeroBanner({ navigate }: { navigate: NavigateFn }) {
  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)
  const touchStartX = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = (idx: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setActive(idx); setAnimating(false) }, 300)
  }

  const next = () => goTo((active + 1) % BANNERS.length)
  const prev = () => goTo((active - 1 + BANNERS.length) % BANNERS.length)

  useEffect(() => {
    timerRef.current = setInterval(next, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active])

  const b = BANNERS[active]

  return (
    <section
      className="customer-hero-banner mx-5 mb-8 overflow-hidden rounded-[22px] relative select-none md:mx-auto md:w-[calc(100%-80px)] md:max-w-7xl md:rounded-[28px] lg:w-[calc(100%-128px)]"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx < -40) next()
        else if (dx > 40) prev()
      }}>

      {/* Full-bleed photo */}
      <img src={b.img} alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.32s ease' }} />

      {/* Single clean gradient — bottom up only */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)' }} />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4"
        style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.28s ease' }}>
        {/* Eyebrow */}
        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">{b.eyebrow}</p>
        {/* Title + CTA row */}
        <div className="flex items-end justify-between gap-3">
          <p className="text-white text-[17px] font-black leading-[1.2] tracking-[-0.02em] whitespace-pre-line flex-1 md:text-3xl">
            {b.title}
          </p>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button onClick={e => { e.stopPropagation(); navigate(b.dest) }}
              className="rounded-full px-4 py-1.5 text-[11px] font-black text-white whitespace-nowrap"
              style={{ background: b.accent }}>
              {b.cta}
            </button>
            <div className="flex gap-1 justify-end">
              {BANNERS.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); goTo(i) }}
                  className="rounded-full"
                  style={{ height: 4, width: i === active ? 14 : 4, background: i === active ? 'white' : 'rgba(255,255,255,0.35)', transition: 'width 0.3s ease' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigate, onVendorSwitch, initialSearch = '', venues, live = false, categoryOptions, onQuery }: Props) {
  const { dark } = useDarkMode()
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState(initialSearch)
  const [filterOpen, setFilterOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  const bg = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink = dark ? '#F0F0F0' : '#1A1A1A'
  const muted = dark ? '#888' : '#777'
  const border = dark ? '#2A2A2A' : '#EEEEEE'
  const inputBg = dark ? '#1C1C1C' : '#FFFFFF'

  const filteredVenues = (venues ?? allVenues).filter(v => {
    const matchCat = live || activeCategory === 'All' || v.cat === activeCategory
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.location.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <main className="min-h-screen w-full pb-36 font-[family-name:var(--font-ui)] md:pb-16 md:pl-24" style={{ background: bg }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-5 pt-14 pb-4 md:px-10 md:pt-7 lg:px-16" style={{ background: bg }}>
        <div className="flex w-full items-center gap-3">
          <img className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
            src="/reference/c2a1304c9cfc6e70.jpg" alt="Fajify discovery" />
          <div className="flex-1">
            <p className="m-0 text-[20px] font-bold tracking-[-0.035em]" style={{ color: ink }}>
              {live ? 'Discover Fajify' : 'Good morning'} <span style={{ color: RED }}>✦</span>
            </p>
            <p className="m-0.5 text-[14px] font-medium" style={{ color: muted }}>{live ? 'Explore places and experiences' : 'Alex Johnson'}</p>
          </div>
          <button onClick={() => navigate({ name: 'notifications' })}
            className="relative grid h-11 w-11 place-items-center rounded-full border shadow-sm"
            style={{ background: surface, borderColor: border }}>
            <IconBell size={20} color={ink} />
            <i className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full ring-2" style={{ background: RED }} />
          </button>
        </div>
      </header>

      {/* ── Search + Filter ── */}
      <section className="mb-5 w-full px-5 md:px-10 lg:px-16">
        <div className="flex gap-2.5">
          <label className="relative flex h-12 flex-1 items-center rounded-full border" style={{ background: inputBg, borderColor: border }}>
            <span className="absolute left-4"><IconSearch size={20} color={muted} /></span>
            <input value={search} onChange={e => {setSearch(e.target.value);onQuery?.(e.target.value,activeCategory)}}
              placeholder="Search venues, events, movies..."
              className="h-full w-full rounded-full bg-transparent pl-[52px] pr-4 text-sm outline-none"
              style={{ color: ink }} />
          </label>
          <button aria-label="Filter venues" onClick={() => setFilterOpen(true)}
            className="grid h-12 w-12 place-items-center rounded-full border"
            style={{ background: inputBg, borderColor: border }}>
            <IconFilter size={19} color={muted} />
          </button>
        </div>
      </section>

      {/* ── Category filter pills ── */}
      <div className="mt-3 mb-8 flex w-full gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-10 lg:px-16">
        {(categoryOptions ?? categories).map(cat => (
          <button key={cat} onClick={() => {setActiveCategory(cat);onQuery?.(search,cat)}}
            className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-all"
            style={activeCategory === cat
              ? { borderColor: RED, background: RED, color: '#fff' }
              : { borderColor: 'transparent', background: surface, color: muted }}>
            {cat}
          </button>
        ))}
      </div>

      <div className="mb-5 flex w-full items-end justify-between px-5 md:px-10 lg:px-16">
        <div>
          <h1 className="text-[24px] font-black tracking-[-0.04em] md:text-[30px]" style={{ color: ink }}>Recommended for you</h1>
          <p className="mt-1 text-[13px]" style={{ color: muted }}>{live?'Published places and experiences available on Fajify.':'Places matching what people are booking around Lagos.'}</p>
        </div>
        <span className="hidden text-[13px] font-semibold md:block" style={{ color: muted }}>{filteredVenues.length} places</span>
      </div>

      <section className="px-5 mb-8 md:px-10 lg:px-16" aria-label="Events">
        <h2 className="text-xl font-bold mb-4">Events and hangouts</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(live ? [] : upcomingEvents).filter(event => !search || `${event.title} ${event.restaurantName}`.toLowerCase().includes(search.toLowerCase())).map(event => (
            <button key={event.id} onClick={() => navigate({ name: 'eventDetail', id: event.id })} className="rounded-2xl overflow-hidden bg-white text-left">
              <img src={event.image} alt={event.title} className="w-full h-36 object-cover" />
              <div className="p-4"><h3 className="font-bold">{event.title}</h3><p className="text-sm mt-1">{event.date}</p><p className="text-sm mt-1">{event.ticketPrice ? `₦${event.ticketPrice.toLocaleString('en-NG')}` : 'Free'}</p></div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Venue grid ── */}
      <section className="grid w-full grid-cols-1 gap-5 px-5 md:grid-cols-2 md:px-10 xl:grid-cols-3 2xl:grid-cols-4 lg:px-16">
        {filteredVenues.length === 0 ? (
          <div className="py-16 text-center md:col-span-2 xl:col-span-3">
            <p className="text-[16px] font-bold" style={{ color: ink }}>No results</p>
            <p className="text-[13px] mt-1" style={{ color: muted }}>Try a different category or search term</p>
          </div>
        ) : filteredVenues.map(venue => {
          return (
          <article key={venue.id}
            onClick={() => venue.tag === 'Delivery'
              ? navigate({ name: 'deliveryRestaurant', id: venue.id })
              : navigate({ name: 'restaurant', id: venue.id })
            }
            className="overflow-hidden rounded-[20px] cursor-pointer shadow-[0_4px_20px_rgba(30,15,15,.07)]"
            style={{ background: surface }}>

            {/* Hero image */}
            <div className="relative">
              <img src={venue.image} alt={venue.name} className="h-[150px] w-full object-cover md:h-[190px]" />
              {!live && <div className="absolute top-2.5 right-2.5"><SaveBtn id={venue.id} /></div>}
              <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#333]">{venue.tag}</span>
              {live ? <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] text-[#333]">View hours</span> : venue.open
                ? <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#22b969] px-2.5 py-0.5 text-[10px] font-bold text-white">Open</span>
                : <span className="absolute bottom-2.5 right-2.5 rounded-full bg-[#888] px-2.5 py-0.5 text-[10px] font-bold text-white">Closed</span>}
            </div>

            {/* Body */}
            <div className="px-4 pt-4 pb-5">
              {/* Name + price */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold leading-tight truncate" style={{ color: ink }}>{venue.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: muted }}>
                    <IconMapPin size={11} color={muted} />{venue.location}
                  </p>
                </div>
                <span className="text-[14px] font-black shrink-0" style={{ color: RED }}>{venue.price}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[12px] font-semibold text-[#D99520]">
                  <IconStar size={12} color="#D99520" />{venue.rating}
                  <span className="ml-1 font-medium" style={{ color: muted }}>{venue.cat}</span>
                </span>
                <button
                  onClick={e => { e.stopPropagation(); navigate(venue.tag === 'Delivery' ? { name: 'deliveryRestaurant', id: venue.id } : { name: 'restaurant', id: venue.id }) }}
                  className="rounded-full px-4 py-2 text-[12px] font-bold text-white"
                  style={{ background: RED }}>
                  View place
                </button>
              </div>
            </div>
          </article>
          )
        })}
      </section>

      {/* ── FAB ── */}
      {fabOpen && (
        <button onClick={() => setFabOpen(false)}
          className="fixed inset-0 z-[80] bg-black/30" />
      )}
      <div className="customer-fab fixed bottom-[98px] left-1/2 z-[90] w-[360px] max-w-[calc(100%-48px)] -translate-x-1/2 pointer-events-none">
        {fabOpen && (
          <div className="mb-3 flex flex-col items-end gap-3 pr-1">
            <button onClick={() => { setFabOpen(false); navigate({ name: 'planForMe' }) }}
              className="pointer-events-auto rounded-full px-5 py-3 text-[14px] font-black text-white shadow-[0_8px_24px_rgba(250,63,56,.35)]"
              style={{ background: RED }}>
              ✦ Plan For Me
            </button>
            <button onClick={() => { setFabOpen(false); navigate({ name: 'browsePlans' }) }}
              className="pointer-events-auto rounded-full border px-5 py-3 text-[14px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,.10)]"
              style={{ background: surface, borderColor: border, color: ink }}>
              Browse Plans
            </button>
            <Button variant="outline" onClick={() => { setFabOpen(false); navigate({ name: 'createEvent' }) }} className="pointer-events-auto">Plan a hangout</Button>
            <Button variant="outline" onClick={() => { setFabOpen(false); navigate({ name: 'transportation', venueId: '', bookingDetails: { venue: 'Your destination', total: '₦0' } }) }} className="pointer-events-auto">Book a ride</Button>
          </div>
        )}
        <button aria-label="Planning actions" aria-expanded={fabOpen} onClick={() => setFabOpen(o => !o)}
          className="pointer-events-auto ml-auto grid h-[60px] w-[60px] place-items-center rounded-full border shadow-[0_10px_28px_rgba(39,28,28,.18)] transition-transform duration-200"
          style={{ background: surface, borderColor: border, color: RED, transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', fontSize: 30 }}>
          +
        </button>
      </div>

      {filterOpen && live && <section role="dialog" aria-modal="true" aria-label="Filter businesses" className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-5"><div className="faji-card"><h2>Filter by offering type</h2><select aria-label="Offering type" value={activeCategory} onChange={event=>{setActiveCategory(event.target.value);onQuery?.(search,event.target.value);}}>{(categoryOptions??['All']).map(category=><option key={category}>{category}</option>)}</select><button className="faji-primary" onClick={()=>setFilterOpen(false)}>Apply filters</button></div></section>}
      {filterOpen && !live && <FilterSheet onClose={() => setFilterOpen(false)} dark={dark} />}
      <BottomNav active="home" navigate={navigate} />
    </main>
  )
}
