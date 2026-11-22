import type { NavigateFn } from '../App'
import BottomNav from '../components/BottomNav'
import { IconArrowRight, IconEdit, IconGlyph, type IconName } from '../components/Icons'
import { useDarkMode } from '../store/darkMode'

type ActivityCounts = {
  bookings: number | null
  events: number | null
  reviews: number | null
  bookingsMore: boolean
  eventsMore: boolean
  reviewsMore: boolean
  loading: boolean
  error?: string
}

type Props = {
  navigate: NavigateFn
  onLogout: () => void
  logoutError?: string
  onRetry?: () => void
  loading?: boolean
  error?: string
  profile?: { displayName: string; email?: string; createdAt?: string }
  activity?: ActivityCounts
}

const RED = '#FA3F38'

const menuItems = [
  { icon: 'ticket', label: 'My Tickets', screen: 'myTickets' as const },
  { icon: 'tag', label: 'Offers & Promos', screen: 'offers' as const },
  { icon: 'users', label: 'Invite Friends', screen: 'inviteFriends' as const },
  { icon: 'trophy', label: 'My Reviews', screen: 'reviewHistory' as const },
  { icon: 'message', label: 'Notifications', screen: 'notifications' as const },
  { icon: 'message', label: 'Help & Support', screen: 'help' as const },
  { icon: 'more', label: 'Settings', screen: 'settings' as const },
]

const activityItems = [
  { key: 'bookings', moreKey: 'bookingsMore', label: 'Bookings' },
  { key: 'events', moreKey: 'eventsMore', label: 'Events' },
  { key: 'reviews', moreKey: 'reviewsMore', label: 'Reviews' },
] as const

export default function ProfileScreen({ navigate, onLogout, logoutError, onRetry, loading = false, error, profile, activity }: Props) {
  const { dark } = useDarkMode()

  const surface = dark ? '#1C1C1C' : '#FFFFFF'
  const bg = dark ? '#0F0F0F' : '#F8F8F8'
  const ink = dark ? '#F0F0F0' : '#1A1A1A'
  const muted = dark ? '#A3A3A3' : '#68666A'
  const border = dark ? '#2A2A2A' : '#E8E8E8'
  const divider = dark ? '#2A2A2A' : '#F0F0F0'
  const iconBg = dark ? '#2A2A2A' : '#F5F5F5'
  const name = profile?.displayName?.trim()
  const initial = name?.[0]?.toLocaleUpperCase() || 'F'

  return (
    <div className="min-h-screen w-full pb-24 font-[family-name:var(--font-ui)] md:pl-24" style={{ background: bg }}>
      <header className="border-b px-5 pb-5 pt-10 md:px-10 md:pt-8 lg:px-12" style={{ background: bg, borderColor: border }}>
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="flex items-center gap-4 py-1 md:gap-5">
            <div
              role="img"
              aria-label={loading ? 'Loading profile' : `${name || 'Fajify'} profile`}
              className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full text-xl font-black text-white md:h-[68px] md:w-[68px] md:text-2xl"
              style={{ background: 'linear-gradient(135deg, #FA3F38, #C82924)', boxShadow: '0 8px 24px rgba(250,63,56,.2)' }}
            >
              {loading ? <span className="animate-pulse"> </span> : initial}
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <div className="grid gap-2" role="status" aria-live="polite">
                  <span className="h-6 w-48 max-w-full animate-pulse rounded bg-neutral-300/50 dark:bg-neutral-600/50" />
                  <span className="h-3 w-56 max-w-full animate-pulse rounded bg-neutral-300/40 dark:bg-neutral-600/40" />
                  <span className="h-5 w-24 animate-pulse rounded-full bg-neutral-300/40 dark:bg-neutral-600/40" />
                  <span className="sr-only">Loading your profile…</span>
                </div>
              ) : (
                <>
                  <h1 className="truncate text-[22px] font-black tracking-[-0.03em] md:text-[26px]" style={{ color: ink }}>{name || 'Fajify account'}</h1>
                  <p className="mt-1 truncate text-[13px]" style={{ color: muted }}>{profile?.email || 'Email unavailable'}</p>
                  <span className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: RED }}>
                    Fajify Member
                  </span>
                </>
              )}
            </div>
            {!loading && !error && (
              <button
                aria-label="Edit profile"
                onClick={() => navigate({ name: 'settings' })}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
                style={{ background: surface, borderColor: border }}
              >
                <IconEdit size={16} color={muted} />
              </button>
            )}
          </div>

          {!loading && error ? (
            <div className="mt-5 rounded-2xl border p-4" role="alert" style={{ background: surface, borderColor: border, color: ink }}>
              <p className="m-0 text-sm">{error}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {onRetry && <button className="faji-outline" onClick={onRetry}>Try again</button>}
                <a className="faji-outline" href="/login">Sign in</a>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-[14px] border" aria-label="Account activity" aria-busy={activity?.loading || undefined} style={{ background: surface, borderColor: border }}>
              {activityItems.map(({ key, moreKey, label }, index) => {
                const count = activity?.[key]
                const hasMore = activity?.[moreKey]
                const value = activity?.loading ? '…' : count == null ? '—' : `${count}${hasMore ? '+' : ''}`
                return (
                  <div key={key} className="px-2 py-2 text-center md:py-2.5" style={{ borderRight: index < activityItems.length - 1 ? `1px solid ${divider}` : 'none' }}>
                    <p className="m-0 text-lg font-black leading-6 md:text-xl" style={{ color: RED }}>{value}</p>
                    <p className="mb-0 mt-0.5 text-[10px] md:text-xs" style={{ color: muted }}>{label}</p>
                  </div>
                )
              })}
            </div>
          )}
          {activity?.error && !loading && !error && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" role="status" style={{ color: muted }}>
              <span>Some activity counts could not be loaded.</span>
              {onRetry && <button className="faji-outline" onClick={onRetry}>Retry counts</button>}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-5 pb-28 md:px-10 lg:px-12">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: muted }}>Account and activity</p>
        <div className="overflow-hidden rounded-[20px] border" style={{ background: surface, borderColor: border }}>
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate({ name: item.screen })}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-opacity active:opacity-70 md:px-5"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: index < menuItems.length - 1 ? `1px solid ${divider}` : 'none',
                cursor: 'pointer',
              }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ background: iconBg }}>
                <IconGlyph name={item.icon as IconName} size={20} color={RED} />
              </div>
              <span className="flex-1 text-[14px] font-semibold" style={{ color: ink }}>{item.label}</span>
              <IconArrowRight size={16} color={muted} />
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[20px] border" style={{ background: surface, borderColor: dark ? '#4A1A1A' : '#FFE5E5' }}>
          <button onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-left md:px-5" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: dark ? '#321918' : '#FFF1F0' }}>
              <IconGlyph name="logout" size={20} color={RED} />
            </div>
            <span className="text-[14px] font-bold" style={{ color: RED }}>Log Out</span>
          </button>
        </div>
        {logoutError && <p className="m-0 text-sm" role="alert" style={{ color: RED }}>{logoutError}</p>}
      </main>

      <BottomNav active="profile" navigate={navigate} />
    </div>
  )
}
