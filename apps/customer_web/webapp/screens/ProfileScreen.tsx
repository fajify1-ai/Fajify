import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconArrowRight, IconEdit } from '../components/Icons'
import { IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

type Props = {
  navigate: NavigateFn
  onLogout: () => void
  profile?: {displayName:string; email?:string; createdAt?:string}
}

const RED = '#FA3F38'

const menuItems = [
  { icon: 'ticket',  label: 'My Tickets',      screen: 'myTickets' as const },
  { icon: 'tag',     label: 'Offers & Promos',  screen: 'offers' as const },
  { icon: 'users',   label: 'Invite Friends',   screen: 'inviteFriends' as const },
  { icon: 'trophy',  label: 'My Reviews',       screen: 'reviewHistory' as const },
  { icon: 'message', label: 'Notifications',    screen: 'notifications' as const },
  { icon: 'message', label: 'Help & Support',   screen: 'help' as const },
  { icon: 'more',    label: 'Settings',         screen: 'settings' as const },
]

export default function ProfileScreen({ navigate, onLogout, profile }: Props) {
  const { dark } = useDarkMode()

  const surface  = dark ? '#1C1C1C' : '#FFFFFF'
  const bg       = dark ? '#0F0F0F' : '#F8F8F8'
  const ink      = dark ? '#F0F0F0' : '#1A1A1A'
  const muted    = dark ? '#888' : '#777477'
  const border   = dark ? '#2A2A2A' : '#E8E8E8'
  const divider  = dark ? '#2A2A2A' : '#F3F3F3'
  const iconBg   = dark ? '#2A2A2A' : '#F5F5F5'

  return (
    <div className="min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>

      <header className="px-5 pt-10 pb-5 md:px-10 md:pt-8 lg:px-16" style={{ background: bg }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4 rounded-[24px] border p-5 md:p-6" style={{ background: surface, borderColor: border }}>
            <div
              role="img"
              aria-label={`${profile?.displayName ?? 'Fajify'} profile`}
              className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #FA3F38, #C82924)', boxShadow: '0 8px 24px rgba(250,63,56,.22)' }}
            >
              {(profile?.displayName?.trim()[0] ?? 'F').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[22px] font-black tracking-[-0.03em]" style={{ color: ink }}>{profile?.displayName || 'Fajify account'}</h1>
              <p className="mt-1 truncate text-[13px]" style={{ color: muted }}>{profile?.email || 'Email unavailable'}</p>
              <span className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: dark ? '#321918' : '#FFF1F0', color: dark ? '#FF807A' : '#C82924' }}>
                Customer account
              </span>
            </div>
            <button aria-label="Open settings" onClick={() => navigate({ name: 'settings' })}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
              style={{ background: bg, borderColor: border }}>
            <IconEdit size={16} color={muted} />
          </button>
        </div>
        </div>
      </header>

      {/* ── Menu list ── */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-4 pb-28 md:px-10 lg:px-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: muted }}>Account and activity</p>
        <div className="rounded-[20px] overflow-hidden border" style={{ background: surface, borderColor: border }}>
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.screen && navigate({ name: item.screen })}
              className="w-full flex items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-70"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: i < menuItems.length - 1 ? `1px solid ${divider}` : 'none',
                cursor: item.screen ? 'pointer' : 'default',
              }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] shrink-0"
                style={{ background: iconBg }}>
                <IconGlyph name={item.icon as IconName} size={20} color={RED} />
              </div>
              <span className="flex-1 text-[14px] font-semibold" style={{ color: ink }}>{item.label}</span>
              {item.screen && <IconArrowRight size={16} color={muted} />}
            </button>
          ))}
        </div>

        {/* Log out */}
        <div className="rounded-[20px] overflow-hidden border" style={{ background: surface, borderColor: dark ? '#4A1A1A' : '#FFE5E5' }}>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: '#FFF1F0' }}>
              <IconGlyph name="logout" size={20} color={RED} />
            </div>
            <span className="text-[14px] font-bold" style={{ color: RED }}>Log Out</span>
          </button>
        </div>
      </div>

      <BottomNav active="profile" navigate={navigate} />
    </div>
  )
}
