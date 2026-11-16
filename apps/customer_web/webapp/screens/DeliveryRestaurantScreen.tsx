import { useCart } from '../store/cart'
import { useState } from 'react'
import type { NavigateFn } from '../App'
import { useDarkMode } from '../store/darkMode'
import { useSaved } from '../store/saved'

type Props = { navigate: NavigateFn; id: string }

const RED = '#FA3F38'

type MenuItem = {
  id: string
  name: string
  desc: string
  tag: string
  tagColor: string
  price: number
  rating: number
  reviews: string
  image: string
  category: string
}

const MENU: MenuItem[] = [
  {
    id: 'm1', name: 'PEPPERONI', desc: 'Perfect for 2-3 guests', tag: 'Best for parties', tagColor: RED,
    price: 20000, rating: 4.8, reviews: '1.8k',
    image: '/reference/702a6fa085733d4d.jpg',
    category: 'Pizza',
  },
  {
    id: 'm2', name: 'BBQ', desc: 'Perfect for 2-3 guests', tag: 'Best for parties', tagColor: RED,
    price: 20000, rating: 4.8, reviews: '1.8k',
    image: '/reference/987745baf63e79c6.jpg',
    category: 'Pizza',
  },
  {
    id: 'm3', name: 'Chicken Wings With Shawarma - 7PCS', desc: 'Perfect for 7 guests', tag: 'Great for Hangout', tagColor: '#F97316',
    price: 15000, rating: 4.8, reviews: '1.8k',
    image: '/reference/256ce37001dcc1c2.jpg',
    category: 'Chickens',
  },
  {
    id: 'm4', name: 'VEGGIE SUPREME', desc: 'Perfect for 2-3 guests', tag: 'Healthy choice', tagColor: '#22c55e',
    price: 18000, rating: 4.6, reviews: '980',
    image: '/reference/6b4b5a1d3d605212.jpg',
    category: 'Pizza',
  },
  {
    id: 'm5', name: 'CHOCOLATE LAVA CAKE', desc: 'Rich & indulgent dessert', tag: 'Best seller', tagColor: '#8B5CF6',
    price: 5000, rating: 4.9, reviews: '2.1k',
    image: '/reference/e4493dfe9ad1fc07.jpg',
    category: 'Desserts',
  },
  {
    id: 'm6', name: 'GARLIC BREAD SIDES', desc: 'Crispy, buttery garlic bread', tag: 'Popular side', tagColor: '#F59E0B',
    price: 3500, rating: 4.7, reviews: '750',
    image: '/reference/preview-bread.svg',
    category: 'Sides',
  },
  {
    id: 'm7', name: 'COCA COLA 45CL', desc: 'Refreshing soft drink', tag: 'Best for parties', tagColor: RED,
    price: 2000, rating: 4.5, reviews: '500',
    image: '/reference/ee150768cec339f1.jpg',
    category: 'Sides',
  },
]

const CATEGORIES = ['All', 'Chickens', 'Desserts', 'Pizza', 'Sides', 'Extras']

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default function DeliveryRestaurantScreen({ navigate, id }: Props) {
  const { dark } = useDarkMode()
  const { isSaved, toggle } = useSaved()
  const [activeCategory, setActiveCategory] = useState('All')
  const sharedCart = useCart()
  const cart = Object.fromEntries(sharedCart.venueItems(id || 'dominos').map(item => [item.itemId, item.qty]))

  const bg      = dark ? '#0F0F0F' : '#F8F8F8'
  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const ink     = dark ? '#F0F0F0' : '#1A1A1A'
  const muted   = dark ? '#888' : '#888888'
  const border  = dark ? '#2A2A2A' : '#EEEEEE'

  const venueId = id || 'dominos'
  const saved = isSaved(venueId)

  const filtered = activeCategory === 'All' ? MENU : MENU.filter(m => m.category === activeCategory)

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = MENU.find(m => m.id === id)
    return sum + (item ? item.price * qty : 0)
  }, 0)
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0)

  const addToCart = (itemId: string) => {
    const item = MENU.find(item => item.id === itemId)!
    sharedCart.addItem({ venueId, venueName: "Domino's Pizza", venueImage: MENU[0].image, itemId, name: item.name, price: item.price, image: item.image })
  }

  return (
    <div className="min-h-screen max-w-[430px] mx-auto font-[family-name:var(--font-ui)] relative" style={{ background: bg }}>
      {/* Hero */}
      <div className="relative h-[260px]">
        <img
          src="/reference/aa60ddf27ec4f3a2.jpg"
          alt="Domino's Pizza"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12">
          <button aria-label="Back to discovery" onClick={() => navigate({ name: 'home' })}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => toggle(venueId)}
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? RED : 'none'} stroke={saved ? RED : 'white'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </button>
            <button className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="flex items-center gap-1.5 rounded-full px-3 h-10"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span className="text-[13px] font-semibold text-white">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* White card that slides up over hero */}
      <div className="relative -mt-6 rounded-t-[28px] overflow-hidden" style={{ background: surface }}>
        {/* Venue info */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-[20px] font-black" style={{ color: ink }}>{"Domino's Pizza (Surulere)"}</h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] mb-4" style={{ color: muted }}>
            <span className="flex items-center gap-1" style={{ color: RED }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={RED}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Verified
            </span>
            <span>|</span>
            <span>Open till 09:00 pm</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 rounded-[16px] px-4 py-3 mb-4" style={{ border: `1px solid ${border}` }}>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFC107"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-[14px] font-bold" style={{ color: ink }}>4.8</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>(1.8k Reviews)</p>
            </div>
            <div className="w-px h-8" style={{ background: border }} />
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span className="text-[13px] font-bold" style={{ color: ink }}>30-45min</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>Preparation time</p>
            </div>
            <div className="w-px h-8" style={{ background: border }} />
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span className="text-[13px] font-bold" style={{ color: ink }}>₦500</span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: muted }}>Delivery</p>
            </div>
          </div>

          {/* View Cart CTA */}
          <button
            onClick={() => navigate({ name: 'deliveryCart', venueId })}
            className="w-full flex items-center gap-3 rounded-[16px] px-4 py-4 mb-4 text-white"
            style={{ background: RED }}>
            <div className="h-10 w-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-black">View Cart</p>
              <p className="text-[11px] opacity-80">Review your items and place your order</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Weekend special promo */}
          <div className="flex items-center justify-between rounded-[14px] px-4 py-3 mb-5"
            style={{ background: dark ? '#1A1010' : '#FFF5F5', border: `1px solid ${dark ? '#3A2020' : '#FFD6D4'}` }}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[10px] flex items-center justify-center" style={{ background: dark ? '#2A1010' : '#FFEBE8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: ink }}>Weekend Special</p>
                <p className="text-[11px]" style={{ color: muted }}>Spend ₦15,000 and get <span style={{ color: RED }}>FREE delivery</span></p>
              </div>
            </div>
            <button onClick={() => navigate({ name: 'deliveryCart', venueId })} className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: RED }}>Order Now</button>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none]" style={{ borderBottom: `1px solid ${border}` }}>
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="shrink-0 rounded-full px-4 py-2 text-[13px] font-bold"
                style={{
                  background: active ? RED : 'transparent',
                  color: active ? '#fff' : ink,
                  border: active ? 'none' : `1px solid ${border}`,
                }}>
                {cat}
              </button>
            )
          })}
        </div>

        {/* Menu items */}
        <div className="px-5 pt-4 pb-32 flex flex-col gap-0">
          {filtered.map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-4 py-4"
              style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none' }}>
              {/* Food image */}
              <div className="w-[100px] h-[80px] rounded-[14px] overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[14px] font-black mb-0.5" style={{ color: ink }}>{item.name}</p>
                    <p className="text-[12px] mb-1" style={{ color: muted }}>{item.desc}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: item.tagColor }}>
                      🎉 {item.tag}
                    </span>
                  </div>
                  <button onClick={() => toggle(item.id)} className="ml-2 shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved(item.id) ? RED : 'none'} stroke={isSaved(item.id) ? RED : muted} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  </button>
                </div>

                {/* Price + rating + add button */}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[14px] font-black" style={{ color: ink }}>{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#FFC107"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span className="text-[11px]" style={{ color: muted }}>{item.rating} ({item.reviews} Reviews)</span>
                    </div>
                  </div>
                  {cart[item.id] ? (
                    <div className="flex items-center gap-2 rounded-lg border-2 px-2 py-1" style={{ borderColor: RED }}>
                      <button aria-label={`Remove ${item.name}`} onClick={() => sharedCart.removeItem(`${venueId}__${item.id}`)} className="text-[16px] font-bold w-5 text-center" style={{ color: RED }}>−</button>
                      <span className="text-[13px] font-bold w-4 text-center" style={{ color: ink }}>{cart[item.id]}</span>
                      <button aria-label={`Add ${item.name}`} onClick={() => addToCart(item.id)} className="text-[16px] font-bold w-5 text-center" style={{ color: RED }}>+</button>
                    </div>
                  ) : (
                    <button aria-label={`Add ${item.name}`} onClick={() => addToCart(item.id)}
                      className="h-9 w-9 rounded-lg border-2 flex items-center justify-center"
                      style={{ borderColor: RED }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom cart bar — only shown when items in cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 pb-8 pt-4"
          style={{ background: surface, borderTop: `1px solid ${border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: RED }}>
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: muted }}>{cartCount} items</p>
                <p className="text-[15px] font-black" style={{ color: ink }}>{formatPrice(cartTotal)}</p>
              </div>
            </div>
            <button onClick={() => navigate({ name: 'deliveryCart', venueId: 'dominos' })}
              className="flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-black text-white"
              style={{ background: RED }}>
              View Cart
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
