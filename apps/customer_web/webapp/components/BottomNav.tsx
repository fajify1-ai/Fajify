import React from 'react'
import type { NavigateFn, Screen } from '../App'
import { useDarkMode } from '../store/darkMode'
import { useCart } from '../store/cart'

export type ActiveTab = 'home' | 'search' | 'cart' | 'dashboard' | 'profile'

type Props = {
  active: ActiveTab
  navigate: NavigateFn
}

type IconProps = { active: boolean; inactiveColor: string }

function IconHome({ active, inactiveColor }: IconProps) {
  const c = active ? '#FA3F38' : inactiveColor
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'rgba(255,75,69,0.10)' : 'none'} />
    </svg>
  )
}

function IconSearch({ active, inactiveColor }: IconProps) {
  const c = active ? '#FA3F38' : inactiveColor
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.75 3.5C5.127 3.5 3 5.76 3 8.547C3 14.125 12 20.5 12 20.5C12 20.5 21 14.125 21 8.547C21 5.094 18.873 3.5 16.25 3.5C14.39 3.5 12.78 4.636 12 6.29C11.22 4.636 9.61 3.5 7.75 3.5Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={active ? 'rgba(250,63,56,.08)' : 'none'} />
    </svg>
  )
}

function IconTicket({ active, inactiveColor }: IconProps) {
  const c = active ? '#FA3F38' : inactiveColor
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 9C2 8.44772 2.44772 8 3 8H21C21.5523 8 22 8.44772 22 9V11C20.8954 11 20 11.8954 20 13C20 14.1046 20.8954 15 22 15V17C22 17.5523 21.5523 18 21 18H3C2.44772 18 2 17.5523 2 17V15C3.10457 15 4 14.1046 4 13C4 11.8954 3.10457 11 2 11V9Z"
        stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'rgba(255,75,69,0.10)' : 'none'} />
      <line x1="9" y1="8" x2="9" y2="18" stroke={c} strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

function IconProfile({ active, inactiveColor }: IconProps) {
  const c = active ? '#FA3F38' : inactiveColor
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth={active ? 2.2 : 1.8}
        fill={active ? 'rgba(255,75,69,0.10)' : 'none'} />
      <path d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
        stroke={c} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
    </svg>
  )
}

const sideTabs: { key: ActiveTab; label: string; Icon: React.FC<IconProps>; screen: Screen }[] = [
  { key: 'home',      label: 'Home',     Icon: IconHome,    screen: { name: 'home' } },
  { key: 'search',    label: 'Wishlist', Icon: IconSearch,  screen: { name: 'wishlist' } },
  { key: 'dashboard', label: 'Bookings', Icon: IconTicket,  screen: { name: 'myTickets' } },
  { key: 'profile',   label: 'Profile',  Icon: IconProfile, screen: { name: 'profile' } },
]

function formatShort(n: number) {
  if (n >= 1000000) return '₦' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '₦' + (n / 1000).toFixed(0) + 'k'
  return '₦' + n
}

export default function BottomNav({ active, navigate }: Props) {
  const { dark } = useDarkMode()
  const cart = useCart()
  const inactiveColor = dark ? '#888888' : '#9A9A9A'
  const isCartActive = active === 'cart'

  const left = sideTabs.slice(0, 2)
  const right = sideTabs.slice(2)

  return (
    <nav
      className="app-bottom-nav"
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: 380,
        background: dark ? 'rgba(28,28,28,0.97)' : 'rgba(255,255,255,0.97)',
        border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.92)',
        borderRadius: 30,
        display: 'flex',
        alignItems: 'center',
        zIndex: 100,
        padding: '8px 6px 9px',
        boxShadow: dark ? '0 18px 34px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.3)' : '0 18px 34px rgba(0,0,0,0.16), 0 6px 12px rgba(0,0,0,0.07)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Left two tabs */}
      {left.map(({ key, label, Icon, screen }) => {
        const isActive = active === key
        return (
          <button key={key} onClick={() => navigate(screen)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0 3px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon active={isActive} inactiveColor={inactiveColor} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? '#FA3F38' : inactiveColor, letterSpacing: '0.01em' }}>{label}</span>
          </button>
        )
      })}

      {/* Centre Cart pill — only visible when cart has items */}
      {cart.totalQty > 0 && (
        <button
          onClick={() => navigate({ name: 'globalCart' })}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            padding: '6px 14px 5px',
            borderRadius: 24,
            background: isCartActive ? '#FA3F38' : (dark ? '#2A1010' : '#FFF0F0'),
            border: isCartActive ? 'none' : '1.5px solid #FA3F3844',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: 72,
          }}>
          <div style={{ position: 'relative' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isCartActive ? 'white' : '#FA3F38'} strokeWidth="2.2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{
              position: 'absolute', top: -6, right: -8,
              height: 16, minWidth: 16, borderRadius: 8,
              background: isCartActive ? 'white' : '#FA3F38',
              color: isCartActive ? '#FA3F38' : 'white',
              fontSize: 9, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>{cart.totalQty}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: isCartActive ? 'white' : '#FA3F38', whiteSpace: 'nowrap' }}>
            {formatShort(cart.totalPrice)}
          </span>
        </button>
      )}

      {/* Right two tabs */}
      {right.map(({ key, label, Icon, screen }) => {
        const isActive = active === key
        return (
          <button key={key} onClick={() => navigate(screen)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0 3px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon active={isActive} inactiveColor={inactiveColor} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? '#FA3F38' : inactiveColor, letterSpacing: '0.01em' }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
