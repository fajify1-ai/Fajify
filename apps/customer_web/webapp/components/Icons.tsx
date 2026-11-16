type IconProps = { size?: number; color?: string; strokeWidth?: number }

export function IconBell({ size = 22, color = '#1F1F1F', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSearch({ size = 20, color = '#777477', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
      <path d="M21 21l-4.35-4.35" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconFilter({ size = 20, color = '#777477', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="6" x2="20" y2="6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="10" y1="18" x2="14" y2="18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconArrowLeft({ size = 20, color = '#1F1F1F', strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconArrowRight({ size = 16, color = '#c0b0a8', strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M14 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconHeart({ size = 18, color = '#FA3F38', filled = false, strokeWidth = 1.8 }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconStar({ size = 14, color = '#e8a045', filled = true }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconMapPin({ size = 14, color = '#777477', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  )
}

export function IconClock({ size = 14, color = '#777477', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCheck({ size = 14, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconShare({ size = 18, color = '#FA3F38', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="18" cy="5" r="3" stroke={color} strokeWidth={strokeWidth} />
      <circle cx="6" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      <circle cx="18" cy="19" r="3" stroke={color} strokeWidth={strokeWidth} />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function IconGear({ size = 20, color = '#1F1F1F', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconEdit({ size = 16, color = '#FA3F38', strokeWidth = 1.8 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export type IconName = 'calendar' | 'clock' | 'users' | 'ticket' | 'tag' | 'heart' | 'card' | 'pin' | 'gift' | 'message' | 'user' | 'lock' | 'mail' | 'phone' | 'globe' | 'moon' | 'file' | 'shield' | 'logout' | 'restaurant' | 'wallet' | 'car' | 'party' | 'search' | 'copy' | 'trophy' | 'camera' | 'twitter' | 'more'
export function IconGlyph({ name, size = 20, color = '#1F1F1F' }: { name: IconName; size?: number; color?: string }) {
  const common = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  const paths: Record<IconName, React.ReactNode> = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" {...common}/><path d="M7 3v4M17 3v4M3 10h18" {...common}/></>,
    clock: <><circle cx="12" cy="12" r="9" {...common}/><path d="M12 7v5l3 2" {...common}/></>,
    users: <><circle cx="9" cy="8" r="3" {...common}/><circle cx="17" cy="9" r="2" {...common}/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5M15 15c3 0 5 1.6 5 4" {...common}/></>,
    ticket: <path d="M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V8Z" {...common}/>,
    tag: <path d="m3 12 8-8h7l3 3v7l-8 8L3 12Z M15 8h.01" {...common}/>,
    heart: <path d="M20 8.5C20 5.8 17.9 4 15.4 4c-1.6 0-2.9.8-3.7 2C10.9 4.8 9.6 4 8 4 5.5 4 3.4 5.8 3.4 8.5 3.4 14 12 20 12 20s8-6 8-11.5Z" {...common}/>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" {...common}/><path d="M3 10h18M7 15h3" {...common}/></>, pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" {...common}/><circle cx="12" cy="10" r="2.5" {...common}/></>,
    gift: <><rect x="4" y="9" width="16" height="11" rx="1" {...common}/><path d="M3 9h18v4H3zM12 9v11M12 9H8a2 2 0 1 1 2-3c0 1 2 3 2 3Zm0 0h4a2 2 0 1 0-2-3c0 1-2 3-2 3Z" {...common}/></>,
    message: <path d="M4 5h16v11H9l-5 4V5Z" {...common}/>, user: <><circle cx="12" cy="8" r="3.5" {...common}/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" {...common}/></>, lock: <><rect x="5" y="10" width="14" height="10" rx="2" {...common}/><path d="M8 10V7a4 4 0 0 1 8 0v3" {...common}/></>, mail: <><rect x="3" y="5" width="18" height="14" rx="2" {...common}/><path d="m3 7 9 6 9-6" {...common}/></>, phone: <path d="M7 3h3l1.5 4-2 1.5a15 15 0 0 0 6 6l1.5-2 4 1.5v3c0 1-1 2-2 2C10 19 5 14 5 5c0-1 1-2 2-2Z" {...common}/>, globe: <><circle cx="12" cy="12" r="9" {...common}/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...common}/></>, moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" {...common}/>, file: <><path d="M6 3h8l4 4v14H6z" {...common}/><path d="M14 3v5h5M9 13h6M9 16h5" {...common}/></>, shield: <path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" {...common}/>, logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" {...common}/></>, restaurant: <><path d="M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 2 3 6 0 8" {...common}/></>, wallet: <><path d="M4 7h15v13H4zM4 7V5h13" {...common}/><path d="M15 13h4" {...common}/></>, car: <><path d="m5 16 1.5-6h11L19 16M4 16h16v3H4z" {...common}/><circle cx="7" cy="19" r="1" {...common}/><circle cx="17" cy="19" r="1" {...common}/></>, party: <path d="M4 20 11 3l3 7 7 3-17 7ZM14 10l3-3M17 14h4" {...common}/>, search: <><circle cx="10.5" cy="10.5" r="6.5" {...common}/><path d="m16 16 5 5" {...common}/></>, copy: <><rect x="8" y="8" width="11" height="12" rx="2" {...common}/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" {...common}/></>, trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v5M8 21h8" {...common}/></>, camera: <><rect x="3" y="7" width="18" height="13" rx="2" {...common}/><path d="m8 7 1-3h6l1 3" {...common}/><circle cx="12" cy="13" r="3" {...common}/></>, twitter: <path d="M20 7a7 7 0 0 1-2 1c-1.5-4-7-2-6 2-3 0-5-1.5-7-4-1 3.5 1 5 2 5-1 0-1.5-.3-2-.6.2 2 1.7 3.6 4 3.8-1 .7-2 .9-3 .8 2 1.5 5 1.5 7 0 2-1.5 3-4 3-7v-1c1-.3 2-.8 3-1.5Z" {...common}/>, more: <><circle cx="5" cy="12" r="1" fill={color}/><circle cx="12" cy="12" r="1" fill={color}/><circle cx="19" cy="12" r="1" fill={color}/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">{paths[name]}</svg>
}
