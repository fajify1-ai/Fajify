import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconArrowRight, IconEdit } from '../components/Icons'
import { IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

type Props = { navigate: NavigateFn; onLogout: () => void; profile?: {displayName:string} }

const RED = '#FA3F38'

const menuItems = [
  { icon: 'ticket',  label: 'My Tickets',      screen: 'myTickets' as const,      badge: '3' },
  { icon: 'tag',     label: 'Offers & Promos',  screen: 'offers' as const,         badge: '4' },
  { icon: 'users',   label: 'Invite Friends',   screen: 'inviteFriends' as const },
  { icon: 'trophy',  label: 'My Reviews',       screen: null },
  { icon: 'message', label: 'Notifications',    screen: 'notifications' as const },
  { icon: 'message', label: 'Help & Support',   screen: 'help' as const },
  { icon: 'more',    label: 'Settings',         screen: 'settings' as const },
]

const stats = [
  { label: 'Bookings', value: '12' },
  { label: 'Events',   value: '5' },
  { label: 'Reviews',  value: '8' },
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

      {/* ── Clean white header (no gradient) ── */}
      <div className="sticky top-0 z-10 px-5 pt-14 pb-6 md:px-10 md:pt-8 lg:px-16" style={{ background: surface, borderBottom: `1px solid ${border}` }}>
        <div className="w-full">
        {/* Avatar row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <img
              src="/reference/467b6b06e1735885.jpg"
              alt={profile?"Illustrative profile portrait":"Alex Johnson"}
              className="h-[72px] w-[72px] rounded-full object-cover"
              style={{ border: `3px solid ${RED}` }}
            />
            <div className="absolute bottom-0 right-0 h-[18px] w-[18px] rounded-full border-2 border-white bg-[#22c55e]" />
          </div>
          <div className="flex-1">
            <h1 className="m-0 text-[22px] font-black tracking-[-0.03em]" style={{ color: ink }}>{profile?.displayName??'Alex Johnson'}</h1>
            <p className="mt-0.5 text-[13px]" style={{ color: muted }}>{profile?'Manage your account securely':'alexjohnson@email.com'}</p>
            <span className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: RED }}>
              fajify Member
            </span>
          </div>
          <button onClick={() => navigate({ name: 'settings' })}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{ background: bg, borderColor: border }}>
            <IconEdit size={16} color={muted} />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x rounded-2xl overflow-hidden"
          style={{ background: dark ? '#2A2A2A' : '#F8F8F8', borderColor: border }}>
          {stats.map(s => (
            <div key={s.label} className="py-4 text-center" style={{ borderColor: border }}>
              <p className="m-0 text-[24px] font-black" style={{ color: RED }}>{profile?'—':s.value}</p>
              <p className="m-0 mt-0.5 text-[11px] font-semibold" style={{ color: muted }}>{s.label}</p>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* ── Menu list ── */}
      <div className="flex w-full flex-col gap-5 px-5 py-6 pb-28 md:px-10 lg:px-16">
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
              {!profile && item.badge && (
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: RED }}>
                  {item.badge}
                </span>
              )}
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
