type Props = {
  suffix?: string
  inverse?: boolean
  compact?: boolean
}

export default function FajifyLogo({ suffix, inverse = false, compact = false }: Props) {
  return (
    <div className="flex items-center gap-2" aria-label={suffix ? `fajify ${suffix}` : "fajify"}>
      <svg className={`${compact ? "h-7 w-7" : "h-10 w-10"} shrink-0`} viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <path d="M10 30V15.5C10 8.5 14.7 5 20.2 5c5.2 0 9 3.1 9.3 8.5" stroke="#FA3F38" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M10 18.5h10.5M10 25h21v4.2c0 5.1-3.3 7.8-7.6 7.8-3 0-4.9-1.6-5.4-4" stroke="#FA3F38" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="36" r="2.6" fill="#FA3F38" />
      </svg>
      <span className={`${compact ? "text-base" : "text-xl"} font-black tracking-[-0.05em] ${inverse ? "text-white" : "text-[#1A1A1A]"}`}>
        fajify{suffix ? <span className="ml-1 tracking-[-0.03em]">{suffix}</span> : null}
      </span>
    </div>
  )
}
