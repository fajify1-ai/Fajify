import { useCart } from '../store/cart'
import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'

type Props = { navigate: NavigateFn; venueId: string }

const RED = '#FA3F38'

type CartItem = {
  id: string
  name: string
  desc: string
  tag: string
  unitPrice: number
  qty: number
  image: string
}

const INITIAL_ITEMS: CartItem[] = [
  { id: 'c1', name: 'PEPPERONI', desc: 'Perfect for 2-3 guest', tag: 'Best for parties', unitPrice: 20000, qty: 1, image: '/reference/8e0210c3c1ab8517.jpg' },
  { id: 'c2', name: 'BBQ', desc: 'Perfect for 2-3 guest', tag: 'Best for parties', unitPrice: 20000, qty: 1, image: '/reference/389eb7b9ae79f9e4.jpg' },
  { id: 'c3', name: 'BBQ', desc: 'Perfect for 2-3 guest', tag: 'Best for parties', unitPrice: 20000, qty: 1, image: '/reference/db5e0ed43eeea968.jpg' },
  { id: 'c4', name: 'Coca Cola 45cl', desc: 'Refreshing soft drink', tag: 'Best for parties', unitPrice: 2000, qty: 2, image: '/reference/4f7fec597066c508.jpg' },
]

const SUGGESTIONS = [
  { id: 's1', name: 'Jollof Rice', price: 2000, image: '/reference/82668eef465cf74b.jpg' },
  { id: 's2', name: 'Jollof Rice', price: 2000, image: '/reference/fc306d74a11a41f7.jpg' },
  { id: 's3', name: 'Jollof Rice', price: 2000, image: '/reference/148707746537693f.jpg' },
]

const DELIVERY_FEE = 500

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function DeliveryCartScreen({ navigate, venueId }: Props) {
  const { dark } = useDarkMode()
  const cart = useCart()
  const items: CartItem[] = cart.venueItems(venueId).map(item => ({ id: item.itemId, name: item.name, desc: 'Your selected item', tag: 'Delivery', unitPrice: item.price, qty: item.qty, image: item.image }))
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [suggestions, setSuggestions] = useState<Record<string, boolean>>({})

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#888888'
  const border  = dark ? '#2A2A2A' : '#EEEEEE'

  const changeQty = (id: string, delta: number) => {
    const item = cart.venueItems(venueId).find(item => item.itemId === id)
    if (!item) return
    if (delta < 0) cart.removeItem(item.key)
    else cart.addItem(item)
  }

  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0)
  const total = subtotal + DELIVERY_FEE
  const itemCount = items.reduce((s, it) => s + it.qty, 0)

  return (
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)]" style={{ background: bg }}>
      <p role="note" className="px-5 py-2 text-center text-xs" style={{background:"#FFF1F0",color:"#902621"}}>Interactive demo · No payment, order or ride is submitted</p>
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 z-10 px-5 pt-14 pb-4" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <button onClick={() => navigate({ name: 'deliveryRestaurant', id: venueId })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: bg, border: `1px solid ${border}` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-[18px] font-black" style={{ color: ink }}>Your Cart ({itemCount})</h1>
          <p className="flex items-center gap-1.5 text-[12px]" style={{ color: '#22b969' }}>
            <span className="h-2 w-2 rounded-full bg-[#22b969] inline-block" /> Open till 09:00 pm
          </p>
        </div>
      </div>

      <div className="overflow-y-auto pb-36 [scrollbar-width:none]">
        {/* Venue row */}
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-[16px] px-4 py-3" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-gray-100">
            <img src="/reference/a381bf2161e37c9f.jpg" alt="Dominos" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold" style={{ color: ink }}>{"Domino's Pizza (Surulere)"}</p>
            <p className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: muted }}>
              <span style={{ color: RED }}>✦ Verified</span>
              <span>|</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              30-45min
            </p>
          </div>
          <button className="text-[13px] font-bold shrink-0" style={{ color: RED }}>Change ›</button>
        </div>

        {/* Deliver to address */}
        <div className="mx-5 mt-3 flex items-start justify-between rounded-[16px] px-4 py-3"
          style={{ background: dark ? '#2A1010' : '#FFF5F5', border: `1px solid ${dark ? '#4A2020' : '#FFD6D4'}` }}>
          <div className="flex-1">
            <p className="text-[11px] mb-1" style={{ color: muted }}>Deliver to</p>
            <p className="text-[13px] font-bold" style={{ color: ink }}>12,Adeniran Ogunsanya street,</p>
            <p className="text-[13px]" style={{ color: ink }}>Surulere, Lagos</p>
          </div>
          <button className="text-[13px] font-bold mt-0.5" style={{ color: RED }}>Edit ›</button>
        </div>

        {/* Cart items */}
        {!items.length && <p className="px-5 py-6">Your cart is empty. Add something from the menu.</p>}
        <div className="mx-5 mt-4 flex flex-col gap-0 rounded-[16px] overflow-hidden" style={{ border: `1px solid ${border}` }}>
          {items.map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: surface, borderBottom: i < items.length - 1 ? `1px solid ${border}` : 'none' }}>
              {/* Image */}
              <div className="h-[72px] w-[80px] rounded-[12px] overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black" style={{ color: ink }}>{item.name}</p>
                <p className="text-[11px]" style={{ color: muted }}>{item.desc}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: RED }}>🎉 {item.tag}</p>
                <p className="text-[12px] font-bold mt-1" style={{ color: muted }}>{formatPrice(item.unitPrice)}</p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Trash */}
                <button onClick={() => cart.deleteItem(`${venueId}__${item.id}`)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
                {/* Qty controls */}
                <div className="flex items-center gap-1 rounded-lg border" style={{ borderColor: border }}>
                  <button onClick={() => changeQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-l-lg text-[16px] font-bold"
                    style={{ color: RED }}>−</button>
                  <span className="w-6 text-center text-[13px] font-bold" style={{ color: ink }}>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-r-lg text-[16px] font-bold"
                    style={{ color: RED }}>+</button>
                </div>
                {/* Line total */}
                <p className="text-[13px] font-black" style={{ color: ink }}>{formatPrice(item.unitPrice * item.qty)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* You might also like */}
        <div className="mt-5">
          <p className="px-5 text-[15px] font-bold mb-3" style={{ color: ink }}>You might also like</p>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
            {SUGGESTIONS.map(s => (
              <div key={s.id} className="shrink-0 w-[120px] rounded-[16px] overflow-hidden"
                style={{ background: surface, border: `1px solid ${border}` }}>
                <img src={s.image} alt={s.name} className="h-[80px] w-full object-cover" />
                <div className="p-2.5">
                  <p className="text-[12px] font-bold mb-1" style={{ color: ink }}>{s.name}</p>
                  <p className="text-[12px] font-black mb-2" style={{ color: RED }}>{formatPrice(s.price)}</p>
                  <button
                    onClick={() => { cart.addItem({ venueId, venueName: "Domino's Pizza", venueImage: s.image, itemId: s.id, name: s.name, price: s.price, image: s.image }); setSuggestions(prev => ({ ...prev, [s.id]: true })) }}
                    className="w-full h-8 rounded-lg flex items-center justify-center border-2 text-[18px] font-bold"
                    style={{ borderColor: RED, color: RED }}>
                    {suggestions[s.id] ? '✓' : '+'}
                  </button>
                </div>
              </div>
            ))}
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
              <span style={{ color: muted }}>Subtotal ({itemCount} items)</span>
              <span style={{ color: ink }}>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span style={{ color: muted }}>Delivery Fee</span>
              <span style={{ color: ink }}>{formatPrice(DELIVERY_FEE)}</span>
            </div>
            <div className="border-t pt-2 mt-1 flex justify-between text-[14px] font-black" style={{ borderColor: border }}>
              <span style={{ color: ink }}>Total</span>
              <span style={{ color: RED }}>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-3"
        style={{ background: surface, borderTop: `1px solid ${border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: RED }}>
                  {itemCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-[11px]" style={{ color: muted }}>{itemCount} items</p>
              <p className="text-[14px] font-black" style={{ color: ink }}>{formatPrice(total)}</p>
            </div>
          </div>
          <button
            disabled={!itemCount} onClick={() => navigate({ name: 'globalCart' })}
            className="flex items-center gap-2 rounded-full px-5 py-3.5 text-[14px] font-black text-white"
            style={{ background: RED }}>
            Proceed to Checkout
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
