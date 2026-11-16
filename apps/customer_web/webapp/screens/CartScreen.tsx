import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'

type Props = { navigate: NavigateFn; venueId: string }

const RED = '#FA3F38'
const TRANSPORT_FEE = 8500
const RESERVATION_FEE = 10000
const SPECIAL_REQUEST_FEE = 20000

const addons = [
  { id: 'a1', name: 'Romantic Table Setup', price: 10000, image: '/reference/fc33e07c46168c93.jpg' },
  { id: 'a2', name: 'Birthday Surprise', price: 10000, image: '/reference/18f0723dfb1ba444.jpg' },
  { id: 'a3', name: 'Flower Bouquet', price: 15000, image: '/reference/41bca50ae2f46679.jpg' },
  { id: 'a4', name: 'Champagne Bottle', price: 20000, image: '/reference/801494c745838e7f.jpg' },
]

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function CartScreen({ navigate, venueId }: Props) {
  const { dark } = useDarkMode()
  const [addonQty, setAddonQty] = useState<Record<string, number>>({})
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  // null = banner shown, false = declined, true = added
  const [transportChoice, setTransportChoice] = useState<null | boolean>(null)
  const [pickup, setPickup] = useState('Lekki phase 1, Lagos')
  const [editPickup, setEditPickup] = useState(false)

  const bg           = dark ? '#0F0F0F' : '#F8F8F8'
  const surface      = dark ? '#1C1C1C' : '#FFFFFF'
  const ink          = dark ? '#F0F0F0' : '#1A1A1A'
  const muted        = dark ? '#888' : '#777777'
  const border       = dark ? '#2A2A2A' : '#EEEEEE'
  const lightRed     = dark ? '#2A1010' : '#FFF5F5'
  const lightRedBorder = dark ? '#4A2020' : '#FFE0E0'
  const inputBg      = dark ? '#252525' : '#F5F5F5'

  const addonTotal = Object.entries(addonQty).reduce((sum, [id, qty]) => {
    const a = addons.find(x => x.id === id)
    return sum + (a ? a.price * qty : 0)
  }, 0)
  const transportCost = transportChoice === true ? TRANSPORT_FEE : 0
  const total = RESERVATION_FEE + SPECIAL_REQUEST_FEE + addonTotal + transportCost
  const addonCount = Object.values(addonQty).reduce((s, q) => s + q, 0)
  const itemCount = 1 + addonCount + (transportChoice === true ? 1 : 0)

  const changeQty = (id: string, delta: number) => {
    setAddonQty(prev => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
  }

  return (
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button onClick={() => navigate({ name: 'restaurant', id: venueId })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-[18px] font-black" style={{ color: ink }}>Your Cart ({itemCount})</h1>
          <p className="flex items-center gap-1.5 text-[12px]" style={{ color: '#22b969' }}>
            <span className="h-2 w-2 rounded-full inline-block" style={{ background: '#22b969' }} />
            Open till 09:00 pm
          </p>
        </div>
      </div>

      <div className="pb-36 overflow-y-auto [scrollbar-width:none]">
        {/* Venue row */}
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-[16px] px-4 py-3" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="h-12 w-12 rounded-full shrink-0 overflow-hidden" style={{ background: '#F0F0F0' }}>
            <img src="/reference/4e9de3224bdd50d4.jpg" alt="Shiro" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold" style={{ color: ink }}>Shiro Restaurant (Victory Island)</p>
            <p className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: muted }}>
              <span className="flex items-center gap-1 font-semibold" style={{ color: RED }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={RED}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                Verified
              </span>
              <span style={{ color: border }}>|</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              30min–1hr away
            </p>
          </div>
          <button className="text-[13px] font-bold shrink-0" style={{ color: RED }}>Change ›</button>
        </div>

        {/* Reservation Details */}
        <div className="mx-5 mt-3 rounded-[16px] p-4" style={{ background: lightRed, border: `1px solid ${lightRedBorder}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-bold" style={{ color: ink }}>Reservation Details</p>
            <button className="text-[13px] font-bold" style={{ color: RED }}>Edit ›</button>
          </div>
          <div className="grid grid-cols-4" style={{ gap: 0 }}>
            {[
              { icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ), label: 'Date', value: 'Sat, 17 May 2025' },
              { icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ), label: 'Time', value: '07:00PM' },
              { icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              ), label: 'Guests', value: '2 Guests' },
              { icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              ), label: 'Seating', value: 'Indoor' },
            ].map((item, i) => (
              <div key={item.label} className="text-center px-1"
                style={{ borderRight: i < 3 ? `1px solid ${lightRedBorder}` : 'none' }}>
                <div className="flex justify-center mb-1">{item.icon}</div>
                <p className="text-[10px]" style={{ color: muted }}>{item.label}</p>
                <p className="text-[11px] font-bold leading-tight mt-0.5" style={{ color: ink }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Special Request */}
        <div className="mx-5 mt-3 flex items-center justify-between rounded-[16px] px-4 py-3.5" style={{ background: surface, border: `1px solid ${border}` }}>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: ink }}>
              Special Request <span style={{ color: muted }}>(Optional)</span>
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: muted }}>Window seat, Birthday celebration</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* ── TRANSPORTATION SECTION ─────────────────────────────────── */}

        {/* Banner — shown when undecided */}
        {transportChoice === null && (
          <div className="mx-5 mt-4 overflow-hidden rounded-[20px] relative" style={{ minHeight: 140 }}>
            <img src="/reference/4297de38f4d8700f.jpg"
              alt="Transportation" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'rgba(13,26,46,0.88)' }} />
            <div className="relative p-5">
              <p className="text-[18px] font-black text-white leading-snug mb-4">Would you like us to plan and book your transportation?</p>
              <div className="flex gap-3">
                <button onClick={() => setTransportChoice(false)}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-bold text-white border border-white/50">
                  No, Thanks
                </button>
                <button onClick={() => setTransportChoice(true)}
                  className="flex-1 rounded-full py-2.5 text-[13px] font-bold text-white border border-white/50">
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline transport detail — shown when YES */}
        {transportChoice === true && (
          <>
            {/* Uber provider row */}
            <div className="mx-5 mt-4 flex items-center gap-3 rounded-[16px] px-4 py-3" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="h-12 w-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: '#000' }}>
                <svg width="36" height="14" viewBox="0 0 80 32" fill="white"><text x="0" y="24" fontSize="28" fontWeight="bold" fontFamily="Arial">Uber</text></svg>
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold" style={{ color: ink }}>Uber</p>
                <p className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: muted }}>
                  <span className="font-semibold" style={{ color: RED }}>✦ Verified</span>
                  <span>|</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  13min away
                </p>
              </div>
              <button className="text-[13px] font-bold shrink-0" style={{ color: RED }}>Change ›</button>
            </div>

            {/* Pickup / Dropoff route */}
            <div className="mx-5 mt-3 rounded-[16px] p-4" style={{ background: lightRed, border: `1px solid ${lightRedBorder}` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-bold" style={{ color: ink }}>Ride Options</p>
                <button className="text-[13px] font-bold" style={{ color: RED }}>Edit ›</button>
              </div>
              <div className="flex gap-3">
                {/* Route line */}
                <div className="flex flex-col items-center pt-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={RED}><circle cx="12" cy="12" r="8"/></svg>
                  <div className="flex-1 w-[1px] my-1" style={{ background: `${RED}50`, minHeight: 36, borderLeft: `2px dashed ${RED}50` }} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill={RED}/></svg>
                </div>
                {/* Locations */}
                <div className="flex-1">
                  {editPickup ? (
                    <input value={pickup} onChange={e => setPickup(e.target.value)}
                      onBlur={() => setEditPickup(false)}
                      autoFocus
                      className="w-full rounded-lg border px-3 py-1.5 text-[13px] outline-none mb-3"
                      style={{ background: inputBg, borderColor: RED, color: ink }} />
                  ) : (
                    <div className="mb-3">
                      <p className="text-[10px] mb-0.5" style={{ color: muted }}>Pick up</p>
                      <button onClick={() => setEditPickup(true)} className="text-left">
                        <p className="text-[14px] font-bold" style={{ color: ink }}>{pickup}</p>
                      </button>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: muted }}>Drop off</p>
                    <p className="text-[14px] font-bold" style={{ color: ink }}>Shiro Restaurant,</p>
                    <p className="text-[14px] font-bold" style={{ color: ink }}>Victoria Island, Lagos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Car type selection */}
            <div className="mx-5 mt-3 rounded-[16px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[14px] font-bold" style={{ color: ink }}>Ride Options</p>
                <button className="text-[13px] font-bold" style={{ color: RED }}>Edit ›</button>
              </div>
              <div className="flex items-center gap-4">
                <img src="/reference/f17d9df08668ea38.jpg"
                  alt="Comfort car" className="w-[110px] h-[70px] rounded-[12px] object-cover shrink-0" />
                <div className="flex-1">
                  <p className="text-[15px] font-black mb-0.5" style={{ color: ink }}>Comfort</p>
                  <p className="text-[12px]" style={{ color: muted }}>4 seat</p>
                  <p className="text-[12px]" style={{ color: muted }}>AC · Spacious</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] mb-1" style={{ color: muted }}>Estimated arrival</p>
                  <p className="text-[14px] font-bold mb-1" style={{ color: ink }}>5 mins</p>
                  <p className="text-[14px] font-black" style={{ color: RED }}>{formatPrice(TRANSPORT_FEE)}</p>
                </div>
              </div>
              <button onClick={() => setTransportChoice(null)}
                className="mt-3 w-full text-center text-[12px] font-bold"
                style={{ color: muted }}>
                Remove transportation
              </button>
            </div>
          </>
        )}

        {/* ── YOU MIGHT ALSO LIKE ───────────────────────────────────── */}
        <div className="mt-5">
          <p className="px-5 text-[15px] font-bold mb-3" style={{ color: ink }}>You might also like</p>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {addons.map(addon => {
              const qty = addonQty[addon.id] ?? 0
              return (
                <div key={addon.id} className="shrink-0 w-[130px] rounded-[16px] p-3"
                  style={{ background: surface, border: `1px solid ${border}` }}>
                  <img src={addon.image} alt={addon.name}
                    className="h-[76px] w-full rounded-[10px] object-cover mb-2" />
                  <p className="text-[12px] font-bold leading-tight mb-1" style={{ color: ink }}>{addon.name}</p>
                  <p className="text-[12px] font-black mb-2" style={{ color: RED }}>{formatPrice(addon.price)}</p>
                  {qty === 0 ? (
                    <button onClick={() => changeQty(addon.id, 1)}
                      className="w-full flex items-center justify-center h-8 rounded-lg border-2 text-[18px] font-bold"
                      style={{ borderColor: RED, color: RED }}>+</button>
                  ) : (
                    <div className="flex items-center justify-between h-8 rounded-lg border-2 px-2" style={{ borderColor: RED }}>
                      <button onClick={() => changeQty(addon.id, -1)} className="text-[18px] font-bold" style={{ color: RED }}>−</button>
                      <span className="text-[13px] font-bold" style={{ color: ink }}>{qty}</span>
                      <button onClick={() => changeQty(addon.id, 1)} className="text-[18px] font-bold" style={{ color: RED }}>+</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Promo code */}
        <div className="mx-5 mt-4">
          <button onClick={() => setPromoOpen(o => !o)}
            className="w-full flex items-center justify-between rounded-[16px] px-4 py-3.5"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-3">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              <span className="text-[13px] font-semibold" style={{ color: muted }}>Have a promo code?</span>
            </div>
            <span className="text-[13px] font-bold" style={{ color: RED }}>Apply ›</span>
          </button>
          {promoOpen && (
            <div className="flex gap-2 mt-2">
              <input value={promoCode} onChange={e => setPromoCode(e.target.value)}
                placeholder="Enter promo code"
                className="flex-1 rounded-xl border px-4 py-3 text-[13px] outline-none"
                style={{ background: surface, borderColor: border, color: ink }} />
              <button className="rounded-xl px-4 py-3 text-[12px] font-bold text-white" style={{ background: RED }}>Apply</button>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="mx-5 mt-4 rounded-[16px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
          <p className="text-[15px] font-bold mb-3" style={{ color: ink }}>Order Summary</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span style={{ color: muted }}>Reservation Fee</span>
              <span style={{ color: ink }}>{formatPrice(RESERVATION_FEE)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span style={{ color: muted }}>Special request Fee</span>
              <span style={{ color: ink }}>{formatPrice(SPECIAL_REQUEST_FEE)}</span>
            </div>
            {transportChoice === true && (
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>Transportation</span>
                <span style={{ color: ink }}>{formatPrice(TRANSPORT_FEE)}</span>
              </div>
            )}
            {Object.entries(addonQty).map(([id, qty]) => {
              const a = addons.find(x => x.id === id)
              if (!a || qty === 0) return null
              return (
                <div key={id} className="flex justify-between text-[13px]">
                  <span style={{ color: muted }}>{a.name} ×{qty}</span>
                  <span style={{ color: ink }}>{formatPrice(a.price * qty)}</span>
                </div>
              )
            })}
            <div className="border-t pt-2 mt-1 flex justify-between text-[15px] font-black" style={{ borderColor: border }}>
              <span style={{ color: ink }}>Total</span>
              <span style={{ color: RED }}>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-3"
        style={{ background: surface, borderTop: `1px solid ${border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: RED }}>
                {itemCount}
              </span>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: muted }}>{itemCount} items</p>
              <p className="text-[14px] font-black" style={{ color: ink }}>{formatPrice(total)}</p>
            </div>
          </div>
          <button onClick={() => navigate({ name: 'checkout', venueId })}
            className="flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-black text-white"
            style={{ background: RED }}>
            Proceed to Checkout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
