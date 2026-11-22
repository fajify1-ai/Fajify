import { upcomingEvents } from '../data'
import { useState, useEffect, useRef } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconBell, IconSearch, IconFilter, IconHeart, IconStar, IconMapPin } from '../components/Icons'
import { useSaved } from '../store/saved'
import { useDarkMode } from '../store/darkMode'

type HomeVenue = {
  id: string
  name: string
  cat: string
  location: string
  tag: string
  rating: number
  reviewCount?: number
  summary?: string
  price?: string
  open: boolean
  image?: string
}

type CategoryOption = string | { id: string; name: string }

type Props = {
  navigate: NavigateFn
  onVendorSwitch?: () => void
  initialSearch?: string
  initialCategory?: string
  venues?: HomeVenue[]
  live?: boolean
  categoryOptions?: CategoryOption[]
  searchFilters?: Record<string, string>
  profileName?: string
  profileError?: string
  loading?: boolean
  error?: string
  onRetry?: () => void
  onQuery?: (query: string, category: string) => void
  onFilters?: (filters: Record<string, string>) => void
}

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
const allVenues: HomeVenue[] = [
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
export default function HomeScreen({ navigate, onVendorSwitch, initialSearch = '', initialCategory = 'All', venues, live = false, categoryOptions, searchFilters = {}, profileName, profileError, loading = false, error, onRetry, onQuery, onFilters }: Props) {
  const { dark } = useDarkMode()
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [search, setSearch] = useState(initialSearch)
  const [filterOpen, setFilterOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [location, setLocation] = useState(searchFilters.location ?? '')
  const [coordinates, setCoordinates] = useState({
    latitude: searchFilters.latitude ?? '',
    longitude: searchFilters.longitude ?? '',
  })
  const [radiusKm, setRadiusKm] = useState(searchFilters.radiusKm ?? '10')
  const [filterError, setFilterError] = useState('')

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
  const hasActiveFilters = Boolean(search.trim() || activeCategory !== 'All' || Object.values(searchFilters).some(Boolean))
  const options = (categoryOptions ?? categories.map(name => ({ id: name, name }))).map(option =>
    typeof option === 'string' ? { id: option, name: option } : option
  )
  const displayName = profileName?.trim()
  const firstName = displayName?.split(/\s+/)[0]
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  function applyFilters() {
    if (Boolean(coordinates.latitude) !== Boolean(coordinates.longitude)) {
      setFilterError('Enter both latitude and longitude, or leave both blank.')
      return
    }
    if (coordinates.latitude && coordinates.longitude) {
      const latitude = Number(coordinates.latitude)
      const longitude = Number(coordinates.longitude)
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setFilterError('Enter a valid latitude and longitude.')
        return
      }
      if (radiusKm && (!Number.isInteger(Number(radiusKm)) || Number(radiusKm) < 1 || Number(radiusKm) > 100)) {
        setFilterError('Search radius must be between 1 and 100 km.')
        return
      }
    }

    const filters = {
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(coordinates.latitude ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      ...(coordinates.latitude && radiusKm ? { radiusKm } : {}),
    }

    setFilterError('')
    onFilters?.(filters)
    onQuery?.(search, activeCategory)
    setFilterOpen(false)
  }

  function clearFilters() {
    setSearch('')
    setLocation('')
    setCoordinates({ latitude: '', longitude: '' })
    setRadiusKm('10')
    setActiveCategory('All')
    setFilterError('')
    onFilters?.({})
    onQuery?.('', 'All')
  }

  return (
    <main data-original-screen={live ? true : undefined} className="min-h-screen w-full pb-36 font-[family-name:var(--font-ui)] md:pb-16 md:pl-24" style={{ background: bg }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 px-5 pt-14 pb-4 md:px-10 md:pt-7 lg:px-16" style={{ background: bg }}>
        <div className="flex w-full items-center gap-3">
          <div
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-black text-white shadow-sm ring-2 ring-white/10"
            style={{ background: 'linear-gradient(135deg, #FA3F38, #C82924)' }}
          >
            {firstName?.[0]?.toUpperCase() ?? 'F'}
          </div>
          <div className="flex-1">
            <p className="m-0 text-[20px] font-bold tracking-[-0.035em]" style={{ color: ink }}>
              {live ? `${greeting}${firstName ? `, ${firstName}` : ''}` : 'Good morning'} <span style={{ color: RED }}>✦</span>
            </p>
            <p className="m-0.5 text-[14px] font-medium" style={{ color: muted }}>{live ? 'Find a place for your next moment' : 'Alex Johnson'}</p>
            {live && profileError ? <p role="status" className="m-0.5 text-xs" style={{ color: muted }}>Your profile name could not be loaded.</p> : null}
          </div>
          <button onClick={() => navigate({ name: 'notifications' })}
            className="relative grid h-11 w-11 place-items-center rounded-full border shadow-sm"
            style={{ background: surface, borderColor: border }}>
            <IconBell size={20} color={ink} />
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
      <div className="mt-3 mb-8 flex w-full gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:px-10 lg:px-16" role="group" aria-label="Filter by experience type">
        {options.map(({ id, name }) => (
          <button key={id} aria-pressed={activeCategory === id} onClick={() => {setActiveCategory(id);onQuery?.(search,id)}}
            className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold border-2 transition-all"
            style={activeCategory === id
              ? { borderColor: RED, background: RED, color: '#fff' }
              : { borderColor: 'transparent', background: surface, color: muted }}>
            {id === 'All' ? 'All' : name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      <div className="mb-5 flex w-full items-end justify-between px-5 md:px-10 lg:px-16">
        <div>
          <h1 className="text-[24px] font-black tracking-[-0.04em] md:text-[30px]" style={{ color: ink }}>Recommended for you</h1>
          <p className="mt-1 text-[13px]" style={{ color: muted }}>{live?'Places and experiences published by our local businesses.':'Places matching what people are booking around Lagos.'}</p>
        </div>
        {!loading && !error ? <span className="hidden text-[13px] font-semibold md:block" style={{ color: muted }}>{filteredVenues.length} {filteredVenues.length === 1 ? 'place' : 'places'}</span> : null}
      </div>

      {!live ? <section className="px-5 mb-8 md:px-10 lg:px-16" aria-label="Events">
        <h2 className="text-xl font-bold mb-4">Events and hangouts</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {upcomingEvents.filter(event => !search || `${event.title} ${event.restaurantName}`.toLowerCase().includes(search.toLowerCase())).map(event => (
            <button key={event.id} onClick={() => navigate({ name: 'eventDetail', id: event.id })} className="rounded-2xl overflow-hidden bg-white text-left">
              <img src={event.image} alt={event.title} className="w-full h-36 object-cover" />
              <div className="p-4"><h3 className="font-bold">{event.title}</h3><p className="text-sm mt-1">{event.date}</p><p className="text-sm mt-1">{event.ticketPrice ? `₦${event.ticketPrice.toLocaleString('en-NG')}` : 'Free'}</p></div>
            </button>
          ))}
        </div>
      </section> : null}

      {/* ── Venue grid ── */}
      <section className="grid w-full grid-cols-1 gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-10 xl:grid-cols-4 xl:px-16" aria-label="Recommended places">
        {loading ? (
          <div className="col-span-full rounded-3xl border p-10 text-center" role="status" style={{ background: surface, borderColor: border, color: muted }}>
            Finding places for you…
          </div>
        ) : error ? (
          <div className="col-span-full rounded-3xl border p-8 text-center" role="alert" style={{ background: surface, borderColor: border }}>
            <p className="font-bold" style={{ color: ink }}>We couldn’t load places right now.</p>
            <p className="mt-2 text-sm" style={{ color: muted }}>Please try again in a moment.</p>
            {onRetry ? <button className="mt-5 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: RED }} onClick={onRetry}>Try again</button> : null}
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="col-span-full rounded-3xl border px-6 py-12 text-center sm:px-10" style={{ background: surface, borderColor: border }}>
            <div aria-hidden="true" className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black text-white" style={{ background: 'linear-gradient(135deg, #FA3F38, #C82924)' }}>f.</div>
            <h2 className="text-lg font-extrabold" style={{ color: ink }}>
              {hasActiveFilters ? 'No places match that search' : 'New experiences are on the way'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: muted }}>
              {hasActiveFilters
                ? 'Try another search or clear your filters to see all published places.'
                : 'We’re preparing the first set of places for Fajify. Check back soon, or start planning something you have in mind.'}
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="mt-6 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: RED }}>Clear search and filters</button>
            ) : (
              <button onClick={() => navigate({ name: 'planForMe' })} className="mt-6 rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: RED }}>Plan something</button>
            )}
          </div>
        ) : filteredVenues.map(venue => {
          const destination = venue.tag === 'Delivery'
            ? { name: 'deliveryRestaurant' as const, id: venue.id }
            : { name: 'restaurant' as const, id: venue.id }

          return (
            <article key={venue.id} className="group overflow-hidden rounded-[20px] border shadow-[0_8px_24px_rgba(0,0,0,.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(0,0,0,.18)]" style={{ background: surface, borderColor: border }}>
              <div className="relative">
                {venue.image ? (
                  <img src={venue.image} alt="" className="h-[156px] w-full object-cover md:h-[168px]" />
                ) : (
                  <div aria-hidden="true" className="relative grid h-[156px] place-items-center overflow-hidden md:h-[168px]" style={{ background: 'linear-gradient(135deg, #291817, #522923 55%, #302018)' }}>
                    <span className="absolute -right-4 -top-14 text-[180px] font-black leading-none text-white/[0.04]">f.</span>
                    <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 text-xl font-black text-white/90">{venue.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                {!live && <div className="absolute right-3 top-3"><SaveBtn id={venue.id} /></div>}
                <span className="absolute bottom-3 left-3 max-w-[75%] truncate rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-[#333]">{venue.tag}</span>
                {!live ? (
                  venue.open
                    ? <span className="absolute bottom-3 right-3 rounded-full bg-[#22b969] px-3 py-1 text-[10px] font-bold text-white">Open</span>
                    : <span className="absolute bottom-3 right-3 rounded-full bg-[#666] px-3 py-1 text-[10px] font-bold text-white">Closed</span>
                ) : null}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button onClick={() => navigate(destination)} className="max-w-full truncate text-left text-[15px] font-extrabold leading-tight hover:text-[#FA3F38]" style={{ color: ink }}>{venue.name}</button>
                    <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: muted }}>
                      <IconMapPin size={12} color={muted} />{venue.location}
                    </p>
                  </div>
                  {venue.price && !live ? <span className="shrink-0 text-[13px] font-extrabold" style={{ color: RED }}>{venue.price}</span> : null}
                </div>
                {venue.summary ? <p className="mt-3 line-clamp-2 text-xs leading-5" style={{ color: muted }}>{venue.summary}</p> : null}
                <div className="mt-4 flex min-h-9 items-center justify-between gap-2 border-t pt-3" style={{ borderColor: border }}>
                  {venue.reviewCount && venue.rating > 0 ? (
                    <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-[#D99520]">
                      <IconStar size={13} color="#D99520" />{venue.rating.toFixed(1)}
                      <span className="truncate font-medium" style={{ color: muted }}>· {venue.reviewCount} {venue.reviewCount === 1 ? 'review' : 'reviews'}</span>
                    </span>
                  ) : <span className="text-[11px] font-medium" style={{ color: muted }}>{live ? 'New on Fajify' : venue.cat}</span>}
                  <button onClick={() => navigate(destination)} className="shrink-0 rounded-full px-4 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#E9352F]" style={{ background: RED }}>View place</button>
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
      <div className="customer-fab pointer-events-none fixed bottom-[98px] right-5 z-[90] w-fit max-w-[calc(100%-32px)] md:bottom-8 md:right-8">
        {fabOpen && (
          <div className="mb-3 flex flex-col items-end gap-3 pr-1">
            <button onClick={() => { setFabOpen(false); navigate({ name: 'planForMe' }) }}
              className="pointer-events-auto rounded-full px-5 py-3 text-[14px] font-black text-white shadow-[0_8px_24px_rgba(250,63,56,.35)] transition hover:-translate-y-0.5"
              style={{ background: RED }}>
              ✦ Plan For Me
            </button>
            <button onClick={() => { setFabOpen(false); navigate({ name: 'browsePlans' }) }}
              className="pointer-events-auto rounded-full border px-5 py-3 text-[14px] font-semibold shadow-[0_6px_20px_rgba(0,0,0,.10)] transition hover:-translate-y-0.5"
              style={{ background: surface, borderColor: border, color: ink }}>
              Browse Plans
            </button>
          </div>
        )}
        <button aria-label="Planning actions" aria-expanded={fabOpen} onClick={() => setFabOpen(o => !o)}
          className="pointer-events-auto ml-auto grid h-[60px] w-[60px] place-items-center rounded-full border shadow-[0_10px_28px_rgba(39,28,28,.18)] transition-transform duration-200"
          style={{ background: surface, borderColor: border, color: RED, transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', fontSize: 30 }}>
          +
        </button>
      </div>

      {filterOpen && live ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setFilterOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="home-filter-title" className="max-h-[min(90vh,760px)] w-full max-w-xl overflow-y-auto rounded-3xl border p-6 shadow-2xl sm:p-8" style={{ background: surface, borderColor: border, color: ink }}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="home-filter-title" className="text-xl font-extrabold">Refine your search</h2>
                <p className="mt-1 text-sm" style={{ color: muted }}>Choose a type or narrow places by location.</p>
              </div>
              <button aria-label="Close filters" onClick={() => setFilterOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xl" style={{ borderColor: border, color: muted }}>×</button>
            </div>
            <div className="grid gap-5">
              <label className="grid gap-2 text-sm font-semibold">Experience type
                <select aria-label="Experience type" value={activeCategory} onChange={event => setActiveCategory(event.target.value)} className="rounded-xl border px-4 py-3" style={{ background: inputBg, borderColor: border, color: ink }}>
                  {options.map(option => <option key={option.id} value={option.id}>{option.id === 'All' ? 'All types' : option.name.charAt(0).toUpperCase() + option.name.slice(1)}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">City or area
                <input value={location} onChange={event => setLocation(event.target.value)} maxLength={120} placeholder="e.g. Victoria Island" className="rounded-xl border px-4 py-3" style={{ background: inputBg, borderColor: border, color: ink }} />
              </label>
              <div>
                <p className="mb-2 text-sm font-semibold">Search near a point <span className="font-normal" style={{ color: muted }}>(optional)</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-semibold" style={{ color: muted }}>Latitude
                    <input type="number" step="any" min={-90} max={90} value={coordinates.latitude} onChange={event => setCoordinates(value => ({ ...value, latitude: event.target.value }))} placeholder="6.5244" className="rounded-xl border px-4 py-3 text-sm" style={{ background: inputBg, borderColor: border, color: ink }} />
                  </label>
                  <label className="grid gap-2 text-xs font-semibold" style={{ color: muted }}>Longitude
                    <input type="number" step="any" min={-180} max={180} value={coordinates.longitude} onChange={event => setCoordinates(value => ({ ...value, longitude: event.target.value }))} placeholder="3.3792" className="rounded-xl border px-4 py-3 text-sm" style={{ background: inputBg, borderColor: border, color: ink }} />
                  </label>
                </div>
              </div>
              {coordinates.latitude && coordinates.longitude ? (
                <label className="grid gap-2 text-sm font-semibold">Search radius
                  <input type="number" min={1} max={100} step={1} value={radiusKm} onChange={event => setRadiusKm(event.target.value)} className="rounded-xl border px-4 py-3" style={{ background: inputBg, borderColor: border, color: ink }} />
                </label>
              ) : null}
              <button type="button" onClick={() => {
                if (!navigator.geolocation) { setFilterError('Location is unavailable. Enter coordinates manually.'); return }
                navigator.geolocation.getCurrentPosition(
                  position => { setCoordinates({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) }); setFilterError('') },
                  () => setFilterError('Location permission was denied. Enter coordinates manually.'),
                  { timeout: 10000 }
                )
              }} className="justify-self-start text-sm font-bold" style={{ color: dark ? '#FF807A' : '#C82924' }}>Use my location</button>
              {filterError ? <p role="alert" className="text-sm" style={{ color: dark ? '#FF8B85' : '#A52520' }}>{filterError}</p> : null}
              <div className="mt-2 flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row" style={{ borderColor: border }}>
                <button onClick={clearFilters} className="rounded-full border px-5 py-3 text-sm font-bold" style={{ borderColor: border, color: ink }}>Clear all</button>
                <button onClick={applyFilters} className="rounded-full px-6 py-3 text-sm font-bold text-white" style={{ background: RED }}>Show places</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {filterOpen && !live && <FilterSheet onClose={() => setFilterOpen(false)} dark={dark} />}
      <BottomNav active="home" navigate={navigate} />
    </main>
  )
}
