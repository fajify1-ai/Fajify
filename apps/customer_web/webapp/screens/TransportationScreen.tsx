import { addBooking } from '../store/bookings'
import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import VehicleIllustration, { type VehicleType } from '../components/VehicleIllustration'

type Props = { venueId: string; bookingDetails: Record<string, string>; navigate: NavigateFn }

const RED = '#FA3F38'

function DummyMap({ accent, dark, height = 160 }: { accent: string; dark: boolean; height?: number }) {
  const road  = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'
  const block = dark ? '#141820' : '#DDEAE0'
  const bg2   = dark ? '#1A2030' : '#E4EEF0'
  const park  = dark ? '#142014' : '#C8DCB8'
  return (
    <svg width="100%" height={height} viewBox="0 0 380 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect width="380" height="160" fill={bg2}/>
      <rect x="0"   y="36"  width="380" height="9"  fill={road}/>
      <rect x="0"   y="74"  width="380" height="9"  fill={road}/>
      <rect x="0"   y="114" width="380" height="11" fill={road}/>
      <rect x="62"  y="0"   width="9"  height="160" fill={road}/>
      <rect x="136" y="0"   width="9"  height="160" fill={road}/>
      <rect x="210" y="0"   width="11" height="160" fill={road}/>
      <rect x="292" y="0"   width="9"  height="160" fill={road}/>
      <rect x="0"   y="0"   width="62"  height="36" fill={block} rx="2"/>
      <rect x="71"  y="0"   width="65"  height="36" fill={block} rx="2"/>
      <rect x="145" y="0"   width="65"  height="36" fill={block} rx="2"/>
      <rect x="221" y="0"   width="71"  height="36" fill={block} rx="2"/>
      <rect x="301" y="0"   width="79"  height="36" fill={block} rx="2"/>
      <rect x="0"   y="45"  width="62"  height="29" fill={block} rx="2"/>
      <rect x="71"  y="45"  width="65"  height="29" fill={park}  rx="2"/>
      <rect x="145" y="45"  width="65"  height="29" fill={block} rx="2"/>
      <rect x="221" y="45"  width="71"  height="29" fill={block} rx="2"/>
      <rect x="301" y="45"  width="79"  height="29" fill={block} rx="2"/>
      <rect x="0"   y="83"  width="62"  height="31" fill={block} rx="2"/>
      <rect x="71"  y="83"  width="65"  height="31" fill={block} rx="2"/>
      <rect x="145" y="83"  width="65"  height="31" fill={block} rx="2"/>
      <rect x="221" y="83"  width="71"  height="31" fill={park}  rx="2"/>
      <rect x="301" y="83"  width="79"  height="31" fill={block} rx="2"/>
      <rect x="0"   y="125" width="62"  height="35" fill={block} rx="2"/>
      <rect x="71"  y="125" width="65"  height="35" fill={park}  rx="2"/>
      <rect x="145" y="125" width="65"  height="35" fill={block} rx="2"/>
      <rect x="221" y="125" width="71"  height="35" fill={block} rx="2"/>
      <rect x="301" y="125" width="79"  height="35" fill={block} rx="2"/>
      <circle cx="120" cy="60" r="6" fill={RED}/>
      <line x1="120" y1="60" x2="260" y2="100" stroke={accent} strokeWidth="2.5" strokeDasharray="6 4" opacity="0.8"/>
      <circle cx="260" cy="100" r="6" fill={accent}/>
      <ellipse cx="260" cy="112" rx="5" ry="2" fill="rgba(0,0,0,0.18)"/>
    </svg>
  )
}

const PROVIDERS = [
  { id: 'uber', label: 'Uber', bg: '#000000', fg: '#FFFFFF' },
  { id: 'bolt', label: 'Bolt', bg: '#34D186', fg: '#FFFFFF' },
] as const

const CAR_TYPES = [
  { id: 'economy' as VehicleType, label: 'Economy',      sub: '4 seats · Standard',         price: 6500,  eta: '8 min'  },
  { id: 'comfort' as VehicleType, label: 'Comfort',      sub: '4 seats · AC · Spacious',    price: 8500,  eta: '5 min'  },
  { id: 'premium' as VehicleType, label: 'Premium',      sub: '4 seats · Luxury sedan',     price: 14000, eta: '10 min' },
  { id: 'van'     as VehicleType, label: 'Premium Van',  sub: '7 seats · Luxury MPV',       price: 22000, eta: '15 min' },
]

type CarId      = VehicleType
type ProviderId = typeof PROVIDERS[number]['id']

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

const SAVED_ADDRESSES = [
  { id: 's1', label: 'Home',  addr: '14/16 Kularu St, Eko Atlantic, Lagos' },
  { id: 's2', label: 'Work',  addr: '3 Idowu Taylor St, Victoria Island, Lagos' },
]

export default function TransportationScreen({ venueId, bookingDetails, navigate }: Props) {
  const { dark } = useDarkMode()

  const [provider,      setProvider]      = useState<ProviderId>('uber')
  const [carId,         setCarId]         = useState<CarId>('comfort')
  const [addrMode,      setAddrMode]      = useState<'saved' | 'new'>('saved')
  const [selectedSaved, setSelectedSaved] = useState('s1')
  const [newAddr,       setNewAddr]       = useState('')
  const [pickupDate,    setPickupDate]    = useState(false)
  const [dateAddr,      setDateAddr]      = useState('')
  const [wantTransport, setWantTransport] = useState<boolean | null>(null)

  const bg             = dark ? '#0F0F0F' : '#F8F8F8'
  const surface        = dark ? '#1C1C1C' : '#FFFFFF'
  const ink            = dark ? '#F0F0F0' : '#1A1A1A'
  const muted          = dark ? '#888'    : '#888888'
  const border         = dark ? '#2A2A2A' : '#EEEEEE'
  const subBg          = dark ? '#161616' : '#F5F5F5'
  const redLight       = dark ? '#2A1010' : '#FFF5F5'
  const redLightBorder = dark ? '#4A2020' : '#FFD6D4'

  const car = CAR_TYPES.find(c => c.id === carId)!
  const activePickup = addrMode === 'saved'
    ? (SAVED_ADDRESSES.find(a => a.id === selectedSaved)?.addr ?? '')
    : newAddr

  const reservationTotal = parseInt((bookingDetails.total ?? '').replace(/[^0-9]/g, ''), 10) || 0
  const grandTotal = reservationTotal + (wantTransport ? car.price : 0)

  const goBack = () => venueId
    ? navigate({ name: 'checkout', venueId })
    : navigate({ name: 'home' })

  const confirm = () => {
    if (wantTransport && !activePickup.trim()) return
    if (wantTransport) addBooking({ id: `ride-${Date.now()}`, venueId, name: `Ride to ${bookingDetails.venue ?? 'your destination'}`, venue: activePickup, date: bookingDetails.date ?? 'Today · Demo ride', image: '/reference/a9678cfec86c3be1.jpg', price: formatPrice(car.price), status: 'Upcoming', type: 'ride', hasTransport: true, transportType: car.label, qrValue: 'FAJI:DEMO:RIDE', ref: `DEMO-RIDE-${Date.now()}`, guests: 1 })
    navigate({
    name: 'confirmation',
    type: 'reservation',
    details: { ...bookingDetails, total: formatPrice(grandTotal || reservationTotal), venue: bookingDetails.venue ?? 'Your destination', guests: '1' },
  })
  }

  return (
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      <p role="note" className="px-5 py-2 text-center text-xs" style={{background:"#FFF1F0",color:"#902621"}}>Interactive demo · No payment, order or ride is submitted</p>

      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Go back" onClick={goBack}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-[18px] font-black" style={{ color: ink }}>Transportation</h1>
          <p className="text-[12px]" style={{ color: muted }}>Book a ride to your venue</p>
        </div>
      </div>

      <div className="pb-36 overflow-y-auto [scrollbar-width:none]">

        {/* ── WANT TRANSPORT BANNER ───────────────────────────────── */}
        {wantTransport === null && (
          <div className="mx-5 mt-5 rounded-[20px] overflow-hidden relative" style={{ minHeight: 164 }}>
            <img
              src="/reference/a9678cfec86c3be1.jpg"
              alt="Ride" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(5,12,30,0.82)' }} />
            <div className="relative p-5">
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-2">Add-on</p>
              <p className="text-[18px] font-black text-white leading-snug mb-1">Need a ride to the venue?</p>
              <p className="text-[12px] text-white/60 mb-5">Comfortable rides from {formatPrice(6500)} round trip</p>
              <div className="flex gap-3">
                <button onClick={() => setWantTransport(false)}
                  className="flex-1 rounded-full py-3 text-[13px] font-bold text-white border border-white/25">
                  No Thanks
                </button>
                <button onClick={() => setWantTransport(true)}
                  className="flex-1 rounded-full py-3 text-[13px] font-black text-white"
                  style={{ background: RED }}>
                  Yes, Book a Ride
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DECLINED — always-visible re-add pill ──────────────── */}
        {wantTransport === false && (
          <div className="mx-5 mt-5 flex items-center justify-between rounded-[18px] px-4 py-3.5"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: subBg }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: ink }}>Changed your mind?</p>
                <p className="text-[11px]" style={{ color: muted }}>Add a ride from {formatPrice(6500)}</p>
              </div>
            </div>
            <button onClick={() => setWantTransport(true)}
              className="rounded-full px-4 py-2 text-[12px] font-black text-white"
              style={{ background: RED }}>
              Add Ride
            </button>
          </div>
        )}

        {/* ── FULL CONFIG ─────────────────────────────────────────── */}
        {wantTransport === true && (<>

          {/* Provider */}
          <div className="mx-5 mt-5 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: muted }}>Provider</p>
            <div className="flex gap-2">
              {PROVIDERS.map(p => {
                const active = provider === p.id
                return (
                  <button key={p.id} onClick={() => setProvider(p.id)}
                    className="flex-1 rounded-[14px] py-3 text-[15px] font-black"
                    style={{
                      background: active ? p.bg : subBg,
                      color: active ? p.fg : muted,
                      border: `2px solid ${active ? p.bg : border}`,
                    }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pickup Address */}
          <div className="mx-5 mt-3 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: muted }}>Pickup Address</p>

            {/* Saved / New toggle */}
            <div className="flex gap-2 mb-4 rounded-[12px] p-1" style={{ background: subBg }}>
              {(['saved', 'new'] as const).map(mode => {
                const active = addrMode === mode
                return (
                  <button key={mode} onClick={() => setAddrMode(mode)}
                    className="flex-1 rounded-[10px] py-2 text-[13px] font-black capitalize"
                    style={{
                      background: active ? surface : 'transparent',
                      color: active ? RED : muted,
                      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}>
                    {mode === 'saved' ? 'Saved Address' : 'New Address'}
                  </button>
                )
              })}
            </div>

            {/* Saved addresses list */}
            {addrMode === 'saved' && (
              <div className="flex flex-col gap-2">
                {SAVED_ADDRESSES.map(a => {
                  const active = selectedSaved === a.id
                  return (
                    <button key={a.id} onClick={() => setSelectedSaved(a.id)}
                      className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-left"
                      style={{
                        background: active ? redLight : subBg,
                        border: `1.5px solid ${active ? RED : border}`,
                      }}>
                      <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: active ? RED : border }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : muted} strokeWidth="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black" style={{ color: active ? RED : ink }}>{a.label}</p>
                        <p className="text-[11px] truncate" style={{ color: muted }}>{a.addr}</p>
                      </div>
                      <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: active ? RED : border }}>
                        {active && <div className="h-2.5 w-2.5 rounded-full" style={{ background: RED }} />}
                      </div>
                    </button>
                  )
                })}
                <button onClick={() => setAddrMode('new')}
                  className="flex items-center gap-3 rounded-[14px] px-3 py-3"
                  style={{ background: subBg, border: `1.5px dashed ${border}` }}>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: border }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <p className="text-[13px] font-bold" style={{ color: muted }}>Add new address</p>
                </button>
              </div>
            )}

            {/* New address input */}
            {addrMode === 'new' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                  style={{ background: subBg, border: `1.5px solid ${newAddr ? RED : border}` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={newAddr ? RED : muted} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <input
                    value={newAddr}
                    onChange={e => setNewAddr(e.target.value)}
                    placeholder="Street, area or landmark"
                    autoFocus
                    className="flex-1 text-[13px] font-semibold outline-none bg-transparent"
                    style={{ color: ink }} />
                  {newAddr && (
                    <button onClick={() => setNewAddr('')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
                <button onClick={() => setAddrMode('saved')}
                  className="text-[12px] font-bold text-center" style={{ color: muted }}>
                  ← Use a saved address instead
                </button>
              </div>
            )}

            {/* Route preview with map */}
            {(addrMode === 'saved' || newAddr) && (
              <div className="mt-4 rounded-[14px] overflow-hidden relative" style={{ height: 110, border: `1px solid ${border}` }}>
                <DummyMap accent={RED} dark={dark} height={110} />
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.40)' }} />
                <div className="relative p-3.5 flex gap-3 items-stretch">
                  <div className="flex flex-col items-center py-0.5 shrink-0">
                    <div className="h-3 w-3 rounded-full mt-0.5 shadow-md" style={{ background: RED }} />
                    <div className="flex-1 my-1.5" style={{ borderLeft: '2px dashed rgba(255,255,255,0.5)', minHeight: 20 }} />
                    <div className="h-3 w-3 rounded-full border-2 border-white" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  </div>
                  <div className="flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Pickup</p>
                      <p className="text-[12px] font-semibold text-white leading-snug">
                        {activePickup || 'Your pickup address'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 mb-0.5">Destination</p>
                      <p className="text-[12px] font-semibold text-white leading-snug">
                        {bookingDetails.venue ?? 'Your Venue'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pick up my date */}
            <button onClick={() => setPickupDate(p => !p)}
              className="mt-3 flex items-center gap-3 w-full rounded-[12px] px-3 py-2.5"
              style={{
                background: pickupDate ? RED + '12' : subBg,
                border: `1.5px solid ${pickupDate ? RED : border}`,
              }}>
              <div className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                style={{ background: pickupDate ? RED : 'transparent', border: `2px solid ${pickupDate ? RED : muted}` }}>
                {pickupDate && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-bold" style={{ color: pickupDate ? RED : ink }}>Pick up my date too</p>
                <p className="text-[11px]" style={{ color: muted }}>Add a second pickup stop</p>
              </div>
            </button>
            {pickupDate && (
              <div className="mt-2 flex items-center gap-3 rounded-[12px] px-4 py-3"
                style={{ background: subBg, border: `1.5px solid ${RED}` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <input value={dateAddr} onChange={e => setDateAddr(e.target.value)}
                  placeholder="Date's pickup address"
                  className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: ink }} />
              </div>
            )}
          </div>

          {/* Car Type */}
          <div className="mx-5 mt-3 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: muted }}>Car Type</p>
            <div className="flex flex-col gap-3">
              {CAR_TYPES.map(c => {
                const active = carId === c.id
                return (
                  <button key={c.id} onClick={() => setCarId(c.id)}
                    className="rounded-[16px] overflow-hidden text-left"
                    style={{ border: `2px solid ${active ? RED : border}` }}>
                    {/* Vehicle illustration */}
                    <div className="relative flex items-center justify-center px-4"
                      style={{ background: active ? (dark ? '#1A0A0A' : '#FFF5F5') : (dark ? '#141414' : '#F4F4F6') }}>
                      <VehicleIllustration type={c.id} className="w-full" style={{ maxHeight: 100 }} />
                      {active && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center"
                          style={{ background: RED }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </div>
                    {/* Info row */}
                    <div className="flex items-center justify-between px-3 py-2.5"
                      style={{ background: active ? redLight : subBg }}>
                      <div>
                        <p className="text-[14px] font-black" style={{ color: active ? RED : ink }}>{c.label}</p>
                        <p className="text-[11px]" style={{ color: muted }}>{c.sub} · {c.eta} away</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-black" style={{ color: active ? RED : ink }}>{formatPrice(c.price)}</p>
                        <p className="text-[10px]" style={{ color: muted }}>round trip</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Payment type */}
          <div className="mx-5 mt-3 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: muted }}>Payment Type</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                style={{ background: redLight, border: `1.5px solid ${RED}` }}>
                <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: RED }}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: RED }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold" style={{ color: RED }}>Fixed Price</p>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-black text-white" style={{ background: RED }}>Recommended</span>
                  </div>
                  <p className="text-[11px]" style={{ color: muted }}>Locked in at {formatPrice(car.price)} — no surprises</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                style={{ background: subBg, border: `1.5px solid ${border}` }}>
                <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: muted }} />
                <div className="flex-1">
                  <p className="text-[13px] font-bold" style={{ color: ink }}>Pay After Ride</p>
                  <p className="text-[11px]" style={{ color: muted }}>Estimated · may vary with traffic</p>
                </div>
              </div>
            </div>
          </div>

          {/* Remove */}
          <div className="mt-4 text-center">
            <button onClick={() => setWantTransport(false)}
              className="text-[13px] font-bold" style={{ color: muted }}>
              Remove transportation
            </button>
          </div>

        </>)}

        {/* Order Summary */}
        <div className="mx-5 mt-5 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-black mb-3" style={{ color: ink }}>Order Summary</p>
          <div className="flex flex-col gap-2.5">
            {bookingDetails.venue && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Reservation · {bookingDetails.venue}</span>
                <span style={{ color: ink }}>{bookingDetails.total ?? '—'}</span>
              </div>
            )}
            {wantTransport && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Transport · {car.label}</span>
                <span style={{ color: ink }}>{formatPrice(car.price)}</span>
              </div>
            )}
            <div className="border-t pt-2.5 flex justify-between text-[15px] font-black" style={{ borderColor: border }}>
              <span style={{ color: ink }}>Total</span>
              <span style={{ color: RED }}>{formatPrice(grandTotal || reservationTotal)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4"
        style={{ background: surface, borderTop: `1px solid ${border}` }}>
        <button disabled={wantTransport === null || (wantTransport && !activePickup.trim())} onClick={confirm}
          className="w-full flex items-center justify-between rounded-[16px] px-6 py-4 text-white"
          style={{ background: RED }}>
          <span className="text-[16px] font-black">Confirm Booking</span>
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-black">{formatPrice(grandTotal || reservationTotal)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </button>
      </div>
    </div>
  )
}
