import { useState, useEffect } from 'react'
import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { useDarkMode } from '../store/darkMode'
import { QRCodeSVG } from 'qrcode.react'
import { useBookings } from '../store/bookings'

type Props = { navigate: NavigateFn }
type TabT = 'Upcoming' | 'Orders' | 'Completed' | 'Cancelled'

const RED = '#FA3F38'

const tickets = {
  Upcoming: [
    { id: 't1', name: 'Moana 2', venue: 'Silverbird Cinemas, Ikeja City Mall', date: 'May 29th, 2025 · 6:00PM', image: '/reference/01d8e165a807ed65.jpg', price: '₦6,000', status: 'Upcoming', type: 'cinema', location: { lat: 6.6018, lng: 3.3515, name: 'Ikeja City Mall', address: 'Obafemi Awolowo Way, Ikeja, Lagos' } },
    { id: 't2', name: 'Ilashe Beach Day', venue: 'Ilashe Beach, Lagos', date: 'Jun 14th, 2025 · 10:00AM', image: '/reference/d45c7580a2069c51.jpg', price: '₦100,000', status: 'Upcoming', type: 'beach', location: { lat: 6.4280, lng: 3.4050, name: 'Ilashe Beach', address: 'Ilashe, Lagos Island' } },
    { id: 't3', name: 'Karate Kid Screening', venue: 'Silverbird Cinemas, Ikeja', date: 'Jun 30th, 2025 · 7:30PM', image: '/reference/cf8e2e8e3ef3e07a.jpg', price: '₦8,000', status: 'Upcoming', type: 'cinema', location: { lat: 6.6018, lng: 3.3515, name: 'Silverbird Cinemas', address: 'Obafemi Awolowo Way, Ikeja' } },
  ],
  Orders: [
    { id: 'o1', name: 'Nobu Lagos Order', venue: 'Nobu Lagos, Victoria Island', date: 'Today · Placed 2:14 PM', image: '/reference/efd96164bb108231.jpg', price: '₦47,500', status: 'In Transit', type: 'food', items: ['Wagyu Beef Tenderloin', 'Truffle Pasta', 'Crafted Cocktails x2'] },
    { id: 'o2', name: 'Yellow Chilli Order', venue: 'The Yellow Chilli, Ikoyi', date: 'Today · Placed 1:05 PM', image: '/reference/5d0131411bf893a1.jpg', price: '₦22,000', status: 'Delivered', type: 'food', items: ['Grilled Chicken', 'Jollof Rice', 'Chapman'] },
  ],
  Completed: [
    { id: 't4', name: 'Jazz Night at Maison', venue: 'Terra Kulture, Victoria Island', date: 'Apr 12th, 2025 · 8:00PM', image: '/reference/394a4bdd30f684f0.jpg', price: '₦18,500', status: 'Completed', type: 'event' },
    { id: 't5', name: 'Food & Wine Market', venue: 'Muri Okunola Park, V/I', date: 'Mar 22nd, 2025 · 7:00PM', image: '/reference/110e578aa2771331.jpg', price: 'Free', status: 'Completed', type: 'event' },
  ],
  Cancelled: [
    { id: 't6', name: 'Rooftop Dinner Experience', venue: 'Sky Bar Lagos, Victoria Island', date: 'Feb 8th, 2025 · 7:00PM', image: '/reference/d2fe1a0f33f70226.jpg', price: '₦14,000', status: 'Cancelled', type: 'event' },
  ],
}

// Order tracker steps
const ORDER_STEPS = [
  { key: 'placed',    label: 'Order Placed',     icon: '📋', desc: 'We received your order' },
  { key: 'confirmed', label: 'Confirmed',         icon: '✅', desc: 'Restaurant confirmed' },
  { key: 'preparing', label: 'Preparing',         icon: '👨‍🍳', desc: 'Your food is being prepared' },
  { key: 'pickup',    label: 'Picked Up',         icon: '🛵', desc: 'Rider has your order' },
  { key: 'transit',   label: 'On the Way',        icon: '📍', desc: 'Heading to you now' },
  { key: 'delivered', label: 'Delivered',         icon: '🎉', desc: 'Enjoy your meal!' },
]

// Fake map SVG — schematic Lagos street grid
function MapSVG({ dark, riderProgress }: { dark: boolean; riderProgress: number }) {
  const bg = dark ? '#1A1A1A' : '#E8F0E8'
  const road = dark ? '#2A2A2A' : '#FFFFFF'
  const roadStroke = dark ? '#333' : '#D0D8D0'
  const accent = RED
  // Rider position interpolated along a path
  const rx = 60 + riderProgress * 140
  const ry = 160 - riderProgress * 100
  return (
    <svg width="100%" viewBox="0 0 320 220" style={{ borderRadius: 16 }}>
      <rect width="320" height="220" fill={bg} />
      {/* Grid roads */}
      {[40,80,120,160,200,240,280].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={220} stroke={roadStroke} strokeWidth="8" />)}
      {[40,80,120,160,180].map(y => <line key={`h${y}`} x1={0} y1={y} x2={320} y2={y} stroke={roadStroke} strokeWidth="8" />)}
      {/* Road fills */}
      {[40,80,120,160,200,240,280].map(x => <line key={`vf${x}`} x1={x} y1={0} x2={x} y2={220} stroke={road} strokeWidth="6" />)}
      {[40,80,120,160,180].map(y => <line key={`hf${y}`} x1={0} y1={y} x2={320} y2={y} stroke={road} strokeWidth="6" />)}
      {/* Blocks */}
      {[[10,90,25,25],[90,90,25,25],[170,90,25,25],[10,130,25,20],[90,130,45,20],[170,130,25,20],[10,50,65,20],[170,50,45,20]].map(([x,y,w,h],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={dark ? '#242424' : '#C8D8C8'} rx="3" />
      ))}
      {/* Route dashed line */}
      <path d={`M60,160 Q100,140 ${rx},${ry} Q200,80 260,80`} fill="none" stroke={accent} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.7"/>
      {/* Destination pin */}
      <circle cx="260" cy="80" r="10" fill={accent} />
      <circle cx="260" cy="80" r="5" fill="white" />
      {/* Rider dot */}
      <circle cx={rx} cy={ry} r="10" fill={accent} opacity="0.25" />
      <circle cx={rx} cy={ry} r="7" fill={accent} />
      <text x={rx} y={ry+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white">🛵</text>
      {/* ETA badge */}
      <rect x="200" y="14" width="76" height="22" rx="11" fill={accent} />
      <text x="238" y="25" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="white">ETA ~12 min</text>
    </svg>
  )
}

// Venue navigation map
function VenueMapSVG({ dark }: { dark: boolean }) {
  const bg = dark ? '#1A1A1A' : '#E8F0E8'
  const road = dark ? '#2A2A2A' : '#FFFFFF'
  const roadStroke = dark ? '#333' : '#D0D8D0'
  return (
    <svg width="100%" viewBox="0 0 320 180" style={{ borderRadius: 16 }}>
      <rect width="320" height="180" fill={bg} />
      {[50,100,150,200,250].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={180} stroke={roadStroke} strokeWidth="10" />)}
      {[45,90,135].map(y => <line key={`h${y}`} x1={0} y1={y} x2={320} y2={y} stroke={roadStroke} strokeWidth="10" />)}
      {[50,100,150,200,250].map(x => <line key={`vf${x}`} x1={x} y1={0} x2={x} y2={180} stroke={road} strokeWidth="8" />)}
      {[45,90,135].map(y => <line key={`hf${y}`} x1={0} y1={y} x2={320} y2={y} stroke={road} strokeWidth="8" />)}
      {[[10,55,30,25],[110,55,30,25],[210,55,30,25],[10,100,30,25],[110,100,65,25],[210,100,30,25]].map(([x,y,w,h],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={dark ? '#242424' : '#C8D8C8'} rx="3" />
      ))}
      {/* Route */}
      <path d="M40,160 L40,90 L200,90" fill="none" stroke={RED} strokeWidth="3" strokeDasharray="8 4" />
      {/* You pin (blue) */}
      <circle cx="40" cy="160" r="10" fill="#3B82F6" />
      <circle cx="40" cy="160" r="5" fill="white" />
      {/* Venue pin */}
      <circle cx="200" cy="90" r="12" fill={RED} />
      <circle cx="200" cy="90" r="5" fill="white" />
      <text x="200" y="74" textAnchor="middle" fontSize="9" fontWeight="bold" fill={RED}>Venue</text>
      {/* Distance badge */}
      <rect x="95" y="76" width="60" height="20" rx="10" fill={RED} />
      <text x="125" y="86" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="bold" fill="white">2.4 km away</text>
    </svg>
  )
}

export default function MyTicketsScreen({ navigate }: Props) {
  const [tab, setTab] = useState<TabT>('Upcoming')
  const liveBookings = useBookings()
  const [viewTicket, setViewTicket] = useState<typeof tickets.Upcoming[0] | null>(null)
  const [viewOrder, setViewOrder] = useState<typeof tickets.Orders[0] | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [riderProgress, setRiderProgress] = useState(0.35)
  const [toast, setToast] = useState('')
  const { dark } = useDarkMode()

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1F1F1F'
  const muted   = dark ? '#888' : '#777477'
  const border  = dark ? '#2A2A2A' : '#E8E8E8'
  const cardBg  = dark ? '#1A1A1A' : '#FAFAFA'

  // Animate rider
  useEffect(() => {
    if (!viewOrder || viewOrder.status === 'Delivered') return
    const t = setInterval(() => setRiderProgress(p => Math.min(p + 0.008, 0.99)), 300)
    return () => clearInterval(t)
  }, [viewOrder])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const statusStyle: Record<string, { bg: string; text: string }> = {
    Upcoming:    { bg: dark ? '#0a2a14' : '#f0fdf4', text: '#16a34a' },
    Completed:   { bg: dark ? '#2A2A2A' : '#F3F3F3', text: muted },
    Cancelled:   { bg: dark ? '#2a0a0a' : '#fef2f2', text: '#ef4444' },
    'In Transit':{ bg: dark ? '#1a1210' : '#FFF7ED', text: '#EA580C' },
    Delivered:   { bg: dark ? '#0a2a14' : '#f0fdf4', text: '#16a34a' },
  }

  const getOrderStep = (status: string) => {
    if (status === 'Delivered') return 5
    return 4 // In Transit
  }

  // Merge live bookings from store into Upcoming tab
  const liveAsTickets = liveBookings.map(b => ({
    id: b.id,
    name: b.name,
    venue: b.venue,
    date: b.date,
    image: b.image,
    price: b.price,
    status: b.status,
    type: b.type,
    location: b.location ? { lat: 0, lng: 0, name: b.location.name, address: b.location.address } : undefined,
  }))
  const staticTab = tickets[tab] ?? []
  const allTickets = [...liveAsTickets.filter(ticket => tab === 'Orders' ? ticket.type === 'food' : ticket.type !== 'food' && ticket.status === tab), ...staticTab]

  // ── Full-screen ticket view ───────────────────────────────────────────────
  if (viewTicket) {
    const t = viewTicket
    const qrVal = `FAJI:${t.id}:${t.date}`
    return (
      <div className="min-h-screen w-full md:pl-24" style={{ background: bg, fontFamily: 'var(--font-ui)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 mx-auto flex max-w-5xl items-center justify-between px-5 pt-12 pb-4 md:px-10 md:pt-8" style={{ background: bg }}>
          <button onClick={() => setViewTicket(null)} className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: ink }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            My Tickets
          </button>
          <span className="text-[12px] font-bold px-3 py-1 rounded-full" style={{ background: statusStyle[t.status]?.bg, color: statusStyle[t.status]?.text }}>{t.status}</span>
        </div>

        <div className="w-full px-5 pb-10 md:px-10 lg:px-16">
          {/* Ticket card */}
          <div className="rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)]" style={{ background: surface }}>
            {/* Image header */}
            <div className="relative h-[170px]">
              <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-black text-[20px] leading-tight">{t.name}</p>
                <p className="text-white/75 text-[12px] mt-0.5">{t.venue}</p>
              </div>
            </div>

            {/* Perforated divider */}
            <div className="relative h-0" style={{ borderTop: `2px dashed ${border}` }}>
              <div className="absolute -left-4 -top-4 w-8 h-8 rounded-full" style={{ background: bg }} />
              <div className="absolute -right-4 -top-4 w-8 h-8 rounded-full" style={{ background: bg }} />
            </div>

            {/* Details */}
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                ['Event', t.name],
                ['Date & Time', t.date],
                ['Venue', t.venue],
                ['Amount', t.price],
                ['Ref', `FJ-${t.id.toUpperCase()}-2025`],
                ['Type', t.type?.toUpperCase() ?? 'BOOKING'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: muted }}>{label}</p>
                  <p className="text-[13px] font-bold leading-snug" style={{ color: ink }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Perforated divider */}
            <div className="relative h-0 mx-4" style={{ borderTop: `2px dashed ${border}` }}>
              <div className="absolute -left-8 -top-4 w-8 h-8 rounded-full" style={{ background: bg }} />
              <div className="absolute -right-8 -top-4 w-8 h-8 rounded-full" style={{ background: bg }} />
            </div>

            {/* QR */}
            <div className="flex flex-col items-center py-6">
              <div className="rounded-2xl p-4" style={{ background: '#fff', boxShadow: `0 0 0 3px ${RED}20` }}>
                <QRCodeSVG value={qrVal} size={140} fgColor="#1A1A1A" />
              </div>
              <p className="text-[11px] font-mono mt-3" style={{ color: muted }}>FJ-{t.id.toUpperCase()}-2025</p>
              <p className="text-[11px] mt-1" style={{ color: muted }}>Show this QR at the entrance</p>
            </div>
          </div>

          {/* Navigation map */}
          {'location' in t && t.location && (
            <div className="mt-4 rounded-3xl overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <p className="text-[14px] font-bold" style={{ color: ink }}>Get Directions</p>
                  <p className="text-[11px]" style={{ color: muted }}>{'address' in t.location ? t.location.address : ''}</p>
                </div>
                <button className="rounded-full px-4 py-2 text-[12px] font-bold text-white" style={{ background: RED }}>
                  Open Maps
                </button>
              </div>
              <VenueMapSVG dark={dark} />
              <div className="px-4 pb-4 pt-3 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-[11px]" style={{ color: muted }}>You</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: RED }} />
                  <span className="text-[11px]" style={{ color: muted }}>{'name' in t.location ? t.location.name : 'Venue'}</span>
                </div>
                <span className="ml-auto text-[11px] font-bold" style={{ color: RED }}>~12 min drive</span>
              </div>
            </div>
          )}

          <button onClick={() => setViewTicket(null)}
            className="mt-4 w-full py-4 rounded-2xl text-[15px] font-bold" style={{ background: surface, color: ink, border: `1px solid ${border}` }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  // ── Full-screen order view ────────────────────────────────────────────────
  if (viewOrder) {
    const o = viewOrder
    const step = getOrderStep(o.status)
    const isDelivered = o.status === 'Delivered'

    return (
      <div className="min-h-screen w-full md:pl-24" style={{ background: bg, fontFamily: 'var(--font-ui)' }}>
        <div className="sticky top-0 z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pt-12 pb-4 md:px-10 md:pt-8" style={{ background: bg }}>
          <button onClick={() => { setViewOrder(null); if (isDelivered) showToast('Order delivered! Enjoy your meal 🎉') }}
            className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: ink }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <span className="text-[12px] font-bold px-3 py-1 rounded-full" style={{ background: statusStyle[o.status]?.bg, color: statusStyle[o.status]?.text }}>{o.status}</span>
        </div>

        <div className="w-full px-5 pb-10 space-y-4 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 md:px-10 lg:px-16">
          {/* Order info */}
          <div className="rounded-3xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex gap-3 items-center">
              <img src={o.image} alt={o.name} className="w-14 h-14 rounded-2xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate" style={{ color: ink }}>{o.name}</p>
                <p className="text-[11px]" style={{ color: muted }}>{o.venue}</p>
                <p className="text-[11px]" style={{ color: muted }}>{o.date}</p>
              </div>
              <p className="text-[15px] font-black shrink-0" style={{ color: RED }}>{o.price}</p>
            </div>
            {'items' in o && o.items && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${border}` }}>
                {o.items.map((item: string) => (
                  <p key={item} className="text-[12px] py-0.5" style={{ color: muted }}>· {item}</p>
                ))}
              </div>
            )}
          </div>

          {/* Live map tracker */}
          {!isDelivered && (
            <div className="rounded-3xl overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[14px] font-bold" style={{ color: ink }}>Live Tracking</p>
                <p className="text-[11px]" style={{ color: muted }}>Your rider is on the way</p>
              </div>
              <MapSVG dark={dark} riderProgress={riderProgress} />
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: dark ? '#2A2A2A' : '#F5F5F5' }}>
                  <span className="text-[18px]">🛵</span>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold" style={{ color: ink }}>Chukwuemeka A.</p>
                  <p className="text-[11px]" style={{ color: muted }}>Honda Dispatch · KJA-248-AA</p>
                </div>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: RED }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.3 5.86 19.79 19.79 0 011.21 2.18 2 2 0 013.22 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                </button>
              </div>
            </div>
          )}

          {isDelivered && (
            <div className="rounded-3xl p-5 text-center" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
              <p className="text-[36px] mb-2">🎉</p>
              <p className="text-[16px] font-black text-green-700">Order Delivered!</p>
              <p className="text-[12px] text-green-600 mt-1">Your food has arrived. Enjoy!</p>
            </div>
          )}

          {/* Order steps tracker */}
          <div className="rounded-3xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[14px] font-bold mb-4" style={{ color: ink }}>Order Progress</p>
            {ORDER_STEPS.map((s, i) => {
              const done = i <= step
              const active = i === step
              return (
                <div key={s.key} className="flex gap-3">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] shrink-0 transition-all"
                      style={{ background: done ? (active ? RED : '#22c55e') : (dark ? '#2A2A2A' : '#F0F0F0') }}>
                      {done ? (active ? s.icon : '✓') : <span style={{ color: muted, fontSize: 12 }}>·</span>}
                    </div>
                    {i < ORDER_STEPS.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: i < step ? '#22c55e' : (dark ? '#2A2A2A' : '#E8E8E8') }} />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className="text-[13px] font-bold" style={{ color: done ? ink : muted }}>{s.label}</p>
                    {active && <p className="text-[11px] mt-0.5" style={{ color: muted }}>{s.desc}</p>}
                  </div>
                  {active && !isDelivered && (
                    <div className="shrink-0 flex items-start pt-1">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: RED }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full pb-24 md:pl-24" style={{ background: bg, fontFamily: 'var(--font-ui)' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-5 py-3 shadow-xl text-[13px] font-bold text-white max-w-[360px] w-[90%] text-center"
          style={{ background: '#22c55e' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-12 pb-0 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <div className="w-full">
        <h1 className="text-[22px] font-black mb-3 md:text-[32px]" style={{ color: ink }}>Bookings &amp; orders</h1>
        <div className="flex w-full">
          {(['Upcoming', 'Orders', 'Completed', 'Cancelled'] as TabT[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 0 12px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2.5px solid ${RED}` : '2.5px solid transparent',
              fontSize: 11, fontWeight: 700, color: tab === t ? RED : muted, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
        </div>
      </div>

      {/* List */}
      <div className="flex w-full flex-col gap-4 px-4 pt-6 pb-28 md:px-10 lg:px-16">
        {allTickets.map(ticket => {
          const isOrder = ticket.type === 'food'
          return (
            <div key={ticket.id} className="rounded-[18px] overflow-hidden flex min-h-[116px]" style={{ background: surface, border: `1px solid ${border}` }}>
              <img src={ticket.image} alt={ticket.name} className="w-[96px] shrink-0 object-cover md:w-[180px]" />
              <div className="p-3 flex-1 min-w-0 md:p-5">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <p className="text-[14px] font-bold leading-tight flex-1 truncate md:text-[17px]" style={{ color: ink }}>{ticket.name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: statusStyle[ticket.status]?.bg, color: statusStyle[ticket.status]?.text }}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-[11px] truncate" style={{ color: muted }}>{ticket.venue}</p>
                <p className="text-[11px]" style={{ color: muted }}>{ticket.date}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[13px] font-black" style={{ color: RED }}>{ticket.price}</span>
                  {isOrder ? (
                    <button onClick={() => setViewOrder(ticket as typeof tickets.Orders[0])}
                      className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: dark ? '#2A1010' : '#FFF0F0', color: RED }}>
                      Track Order →
                    </button>
                  ) : ticket.status === 'Upcoming' ? (
                    <button onClick={() => setViewTicket(ticket as typeof tickets.Upcoming[0])}
                      className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: dark ? '#2A1010' : '#FFF0F0', color: RED }}>
                      View Ticket →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}

        {allTickets.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[32px] mb-3">🎟️</p>
            <p className="text-[15px] font-bold" style={{ color: ink }}>No {tab} tickets</p>
            <p className="text-[13px] mt-1" style={{ color: muted }}>Your bookings and orders will appear here</p>
          </div>
        )}

        {/* Help */}
        <div className="rounded-[14px] p-4 flex justify-between items-center mt-2" style={{ background: dark ? '#2A1515' : '#FFF2F1', border: `1.5px solid ${dark ? '#4A2020' : '#f3d5c8'}` }}>
          <p className="text-[12px] flex-1 leading-relaxed" style={{ color: dark ? '#CCA0A0' : '#4B4749' }}>Need help with a ticket or order?</p>
          <button onClick={() => navigate({ name: 'help' })}
            className="px-4 py-2 rounded-full text-[12px] font-bold text-white ml-3 shrink-0"
            style={{ background: RED }}>Get Help</button>
        </div>
      </div>

      <BottomNav active="dashboard" navigate={navigate} />
    </div>
  )
}
