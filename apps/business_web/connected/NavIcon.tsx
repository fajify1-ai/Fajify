import type {ReactElement} from 'react';
// Reused from the recovered Figma merchant dashboard.
export default function NavIcon({
  id,
  active,
  color,
}: {
  id: string
  active: boolean
  color: string
}): ReactElement {
  const s = { stroke: color, fill: "none", strokeWidth: "1.8" }
  if (id === "overview")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <rect
          x="3"
          y="3"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="14"
          y="3"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="3"
          y="14"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
        <rect
          x="14"
          y="14"
          width="7"
          height="7"
          rx="1"
          fill={active ? color : "none"}
        />
      </svg>
    )
  if (id === "tab2")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          fill={active ? color + "20" : "none"}
        />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  if (id === "tab3")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
          fill={active ? color + "15" : "none"}
        />
      </svg>
    )
  if (id === "tab4")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          fill={active ? color + "15" : "none"}
        />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={active ? color + "25" : "none"}
        strokeLinejoin="round"
      />
    </svg>
  )
}
