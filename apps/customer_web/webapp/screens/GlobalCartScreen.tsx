import { addBooking } from '../store/bookings'
import { useState, type ReactNode } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import { useCart } from '../store/cart'
import SuccessOverlay from '../components/SuccessOverlay'

type Props = { navigate: NavigateFn; connected?:{cart:ReturnType<typeof useCart>;busy:boolean;status:ReactNode;payment:ReactNode} }

const RED = '#FA3F38'

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

const SAVED_CARDS = [
  { id: 'visa4242', last4: '4242', holder: 'Ada Okonkwo', expiry: '09/27', colors: ['#1A1A2E', '#16213E'] as [string,string] },
  { id: 'mc1984',  last4: '1984', holder: 'Ada Okonkwo', expiry: '03/26', colors: ['#2D1B69', '#11998E'] as [string,string] },
]

export default function GlobalCartScreen({ navigate, connected }: Props) {
  const { dark } = useDarkMode()
  const localCart = useCart()
  const cart = connected?.cart??localCart
  const [payMethod, setPayMethod] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = connected ? (dark?'#AAA':'#666') : (dark?'#888':'#888')
  const border  = dark ? '#2A2A2A' : '#EEEEEE'
  const inputBg = dark ? '#252525' : '#F5F5F5'

  // Group items by venue
  const groups = cart.items.reduce<Record<string, typeof cart.items>>((acc, item) => {
    if (!acc[item.venueId]) acc[item.venueId] = []
    acc[item.venueId].push(item)
    return acc
  }, {})

  const serviceCharge = connected ? 0 : cart.totalPrice > 0 ? cart.items.every(item => item.venueId === 'dominos') ? 500 : Math.round(cart.totalPrice * 0.05) : 0
  const grandTotal = cart.totalPrice + serviceCharge

  return (
    <>
    <div data-original-screen={!!connected?true:undefined} className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      <p role="note" className="text-xs text-center p-2">{connected?'Saved cart · combined checkout unavailable':'Demo checkout · No payment is submitted'}</p>
      {/* Header */}
      <div className="flex items-center sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black" style={{ color: ink }}>My Cart</h1>
          {cart.totalQty > 0 && (
            <p className="text-[12px]" style={{ color: muted }}>{cart.totalQty} item{cart.totalQty !== 1 ? 's' : ''} from {Object.keys(groups).length} place{Object.keys(groups).length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="w-10" />
      </div>

      {connected?.status}
      {cart.totalQty === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center px-8 pt-32">
          <div className="text-[64px] mb-4">🛒</div>
          <h3 className="text-[20px] font-black mb-2" style={{ color: ink }}>Your cart is empty</h3>
          <p className="text-[14px] text-center mb-8" style={{ color: muted }}>
            Browse restaurants and add items to start your order.
          </p>
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
            className="rounded-full px-8 py-3.5 text-[14px] font-black text-white"
            style={{ background: RED }}>
            Explore restaurants
          </button>
        </div>
      ) : (
        <div className="pb-40 overflow-y-auto [scrollbar-width:none]">

          {/* Items grouped by venue */}
          {Object.entries(groups).map(([venueId, venueItems]) => {
            const venue = venueItems[0]
            const venueTotal = venueItems.reduce((s, i) => s + i.price * i.qty, 0)
            return (
              <div key={venueId} className="mx-5 mt-5 rounded-[20px] overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
                {/* Venue header */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="h-11 w-11 rounded-[12px] overflow-hidden shrink-0">
                    {venue.venueImage&&<img src={venue.venueImage} alt={venue.venueName} className="h-full w-full object-cover"/>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-black" style={{ color: ink }}>{venue.venueName}</p>
                    <p className="text-[12px]" style={{ color: muted }}>{venueItems.length} item{venueItems.length !== 1 ? 's' : ''} · {connected&&venueId==='unavailable'?'Unavailable':formatPrice(venueTotal)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigate({ name: 'restaurant', id: venueId })}
                      className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                      style={{ background: dark ? '#2A2A2A' : '#F5F5F5', color: ink }}>
                      Add more
                    </button>
                    <button aria-label={`Remove items from ${venue.venueName}`} disabled={connected?.busy} onClick={() => cart.clearVenue(venueId)}
                      className="h-7 w-7 flex items-center justify-center rounded-full"
                      style={{ background: dark ? '#2A1010' : '#FFF0F0' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y" style={{ borderColor: border }}>
                  {venueItems.map(item => (
                    <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-[56px] w-[56px] rounded-[10px] overflow-hidden shrink-0">
                        {item.image&&<img src={item.image} alt={item.name} className="h-full w-full object-cover"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate" style={{ color: ink }}>{item.name}</p>
                        <p className="text-[13px] font-black mt-0.5" style={{ color: connected?'#C82924':RED }}>{connected&&item.venueId==='unavailable'?'Unavailable':formatPrice(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button aria-label={`Decrease ${item.name} quantity`} disabled={connected?.busy} onClick={() => cart.removeItem(item.key)}
                          className="h-7 w-7 rounded-full border-2 flex items-center justify-center font-bold text-[16px]"
                          style={{ borderColor: RED, color: connected?'#C82924':RED }}>−</button>
                        <span className="w-5 text-center text-[14px] font-black" style={{ color: ink }}>{item.qty}</span>
                        <button aria-label={`Increase ${item.name} quantity`} disabled={connected?.busy} onClick={() => cart.addItem({ venueId: item.venueId, venueName: item.venueName, venueImage: item.venueImage, itemId: item.itemId, name: item.name, price: item.price, image: item.image })}
                          className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-[16px] text-white"
                          style={{ background: RED }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reservation CTA for this venue */}
                <div className="px-4 py-3" style={{ borderTop: `1px solid ${border}` }}>
                  <button
                    onClick={() => navigate({ name: 'restaurant', id: venueId })}
                    className="w-full flex items-center justify-between rounded-[12px] px-4 py-2.5"
                    style={{ background: dark ? '#1A0A0A' : '#FFF5F5', border: `1px dashed ${RED}55` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">📅</span>
                      <div className="text-left">
                        <p className="text-[12px] font-bold" style={{ color: ink }}>Also want to book a table?</p>
                        <p className="text-[11px]" style={{ color: muted }}>Add a reservation from the venue page</p>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Promo */}
          <div className="mx-5 mt-4">
            <button onClick={() => setPromoOpen(o => !o)}
              className="w-full flex items-center justify-between rounded-[16px] px-4 py-3.5"
              style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                <span className="text-[13px] font-semibold" style={{ color: muted }}>Have a promo code?</span>
              </div>
              <span className="text-[12px] font-bold" style={{ color: connected?'#C82924':RED }}>Apply ›</span>
            </button>
            {connected&&promoOpen&&<p>Automatic discounts are unavailable. Read merchant offer terms before ordering.</p>}
            {promoOpen && (
              <div className="flex gap-2 mt-2">
                <input aria-label="Promo code" disabled={!!connected} value={promoCode} onChange={e => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 rounded-xl border px-4 py-3 text-[13px] outline-none"
                  style={{ background: inputBg, borderColor: border, color: ink }} />
                <button disabled={!!connected} className="rounded-xl px-5 py-3 text-[12px] font-bold text-white" style={{ background: RED }}>Apply</button>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="mx-5 mt-4 rounded-[18px] p-4" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[15px] font-black mb-3" style={{ color: ink }}>Order Summary</p>
            <div className="flex flex-col gap-2">
              {Object.entries(groups).map(([venueId, venueItems]) => {
                const venueTotal = venueItems.reduce((s, i) => s + i.price * i.qty, 0)
                return (
                  <div key={venueId} className="flex justify-between text-[13px]">
                    <span style={{ color: muted }}>{venueItems[0].venueName}</span>
                    <span style={{ color: ink }}>{connected&&venueId==='unavailable'?'Unavailable':formatPrice(venueTotal)}</span>
                  </div>
                )
              })}
              <div className="flex justify-between text-[13px]">
                <span style={{ color: muted }}>{connected ? 'No checkout fees quoted' : cart.items.every(item => item.venueId === 'dominos') ? 'Delivery fee' : 'Service charge (5%)'}</span>
                <span style={{ color: ink }}>{formatPrice(serviceCharge)}</span>
              </div>
              <div className="border-t pt-2 mt-1 flex justify-between text-[15px] font-black" style={{ borderColor: border }}>
                <span style={{ color: ink }}>Total</span>
                <span style={{ color: connected?'#C82924':RED }}>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>

          {connected ? <section className="mx-5 mt-4 rounded-[20px] p-5" style={{background:surface,border:`1px solid ${border}`}}><h2>Payment Method</h2>{connected.payment}</section> : <>
          {/* Payment */}
          <div className="mx-5 mt-4 rounded-[20px] overflow-hidden" style={{ background: surface, border: `1px solid ${border}` }}>
            <p className="text-[15px] font-black px-5 pt-5 pb-4" style={{ color: ink }}>Payment Method</p>
            <div className="px-5 pb-5 flex flex-col gap-3">
              {SAVED_CARDS.map(card => {
                const active = payMethod === card.id
                return (
                  <button key={card.id} onClick={() => setPayMethod(card.id)}
                    className="rounded-[14px] overflow-hidden text-left w-full"
                    style={{ border: `2px solid ${active ? RED : border}`, boxShadow: active ? `0 0 0 3px ${RED}22` : 'none' }}>
                    <div className="px-4 py-3 relative flex items-center gap-4"
                      style={{ background: `linear-gradient(135deg, ${card.colors[0]}, ${card.colors[1]})` }}>
                      <div>
                        <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Card Holder</p>
                        <p className="text-white text-[13px] font-bold">{card.holder}</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-white text-[13px] font-bold tracking-[3px]">•••• {card.last4}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/50 text-[9px] uppercase tracking-wider mb-0.5">Expires</p>
                        <p className="text-white text-[12px] font-bold">{card.expiry}</p>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center" style={{ background: RED }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
              <button onClick={() => setPayMethod('transfer')}
                className="rounded-[14px] px-4 py-3 flex items-center gap-3 w-full text-left"
                style={{ border: `1.5px solid ${payMethod === 'transfer' ? RED : border}`, background: payMethod === 'transfer' ? (dark ? '#1A0808' : '#FFF5F5') : 'transparent' }}>
                <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: payMethod === 'transfer' ? RED : (dark ? '#252525' : '#EAEAEA') }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={payMethod === 'transfer' ? 'white' : muted} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div>
                  <p className="text-[13px] font-black" style={{ color: payMethod === 'transfer' ? RED : ink }}>Bank Transfer</p>
                  <p className="text-[11px]" style={{ color: muted }}>Pay via direct transfer</p>
                </div>
              </button>
            </div>
          </div>
          </>}
        </div>
      )}

      {/* Bottom bar */}
      {cart.totalQty > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-3"
          style={{ background: surface, borderTop: `1px solid ${border}` }}>
          {!connected&&!payMethod && (
            <p className="text-center text-[11px] mb-2" style={{ color: muted }}>Select a payment method to continue</p>
          )}
          <button
            disabled={!!connected||!payMethod}
            onClick={() => {
              if(connected)return;
              const firstVenueId = Object.keys(groups)[0] ?? ''
              const firstItem = cart.items.find(i => i.venueId === firstVenueId)
              const navArgs = {
                name: 'orderTracking' as const,
                orderTotal: formatPrice(grandTotal),
                venueName: firstItem?.venueName ?? 'Your Order',
                venueImage: firstItem?.venueImage ?? '',
                items: cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
              }
              Object.entries(groups).forEach(([venueId, items]) => addBooking({ id: `order-${venueId}-${Date.now()}`, venueId, name: `${items[0].venueName} Order`, venue: items[0].venueName, date: 'Today · Demo order', image: items[0].venueImage, price: formatPrice(items.reduce((total, item) => total + item.qty * item.price, 0)), status: 'Upcoming', type: 'food', hasTransport: false, qrValue: `FAJI:DEMO:ORDER:${venueId}`, ref: `DEMO-${venueId}`, guests: 1 }))
              cart.clear()
              setPendingNav(() => () => navigate(navArgs))
              setShowSuccess(true)
            }}
            className="w-full rounded-full py-4 text-[15px] font-black text-white flex items-center justify-between px-6 transition-all"
            style={{ background: payMethod ? RED : (dark ? '#2A2A2A' : '#DEDEDE') }}>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <span>{cart.totalQty} item{cart.totalQty !== 1 ? 's' : ''}</span>
            </div>
            <span>{connected ? 'Cart checkout unavailable' : 'Place Order'} · {formatPrice(grandTotal)}</span>
          </button>
        </div>
      )}
    </div>

    {showSuccess && (
      <SuccessOverlay
        title="Order Placed!"
        subtitle="Your food is on its way"
        onDone={() => { setShowSuccess(false); pendingNav?.() }}
      />
    )}
    </>
  )
}
