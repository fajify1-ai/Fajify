import { useDialogFocus } from './useDialogFocus'
import { useState, useEffect } from 'react'
import { useDarkMode } from '../store/darkMode'

const RED = '#FA3F38'
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export type VenueTimeType = 'restaurant' | 'cinema' | 'beach' | 'club' | 'bar' | 'park' | 'spa' | 'default'

type TimeSlot = { label: string; sub: string }

const TIME_SLOTS: Record<VenueTimeType, TimeSlot[]> = {
  restaurant: [
    { label: 'Morning',   sub: '7:00am – 12:00pm' },
    { label: 'Afternoon', sub: '12:00pm – 4:00pm' },
    { label: 'Evening',   sub: '4:00pm – 9:00pm' },
    { label: 'Night',     sub: '9:00pm – close' },
  ],
  cinema: [
    { label: '10:00 AM', sub: '~2hr runtime' },
    { label: '12:30 PM', sub: '~2hr runtime' },
    { label: '3:00 PM',  sub: '~2hr runtime' },
    { label: '5:30 PM',  sub: '~2hr runtime' },
    { label: '8:00 PM',  sub: '~2hr runtime' },
    { label: '10:30 PM', sub: '~2hr runtime' },
  ],
  beach: [
    { label: 'Full Day',  sub: '9:00am – 6:00pm' },
    { label: 'Morning',   sub: '9:00am – 1:00pm' },
    { label: 'Afternoon', sub: '1:00pm – 6:00pm' },
  ],
  club: [
    { label: 'Evening',    sub: '6:00pm – 9:00pm' },
    { label: 'Night',      sub: '9:00pm – 12:00am' },
    { label: 'Late Night', sub: '12:00am – 4:00am' },
  ],
  bar: [
    { label: 'Afternoon', sub: '12:00pm – 5:00pm' },
    { label: 'Evening',   sub: '5:00pm – 9:00pm' },
    { label: 'Night',     sub: '9:00pm – close' },
  ],
  park: [
    { label: 'Morning',   sub: '7:00am – 12:00pm' },
    { label: 'Afternoon', sub: '12:00pm – 5:00pm' },
    { label: 'Full Day',  sub: '7:00am – 5:00pm' },
  ],
  spa: [
    { label: '9:00 AM',  sub: '60-90 min session' },
    { label: '11:00 AM', sub: '60-90 min session' },
    { label: '1:00 PM',  sub: '60-90 min session' },
    { label: '3:00 PM',  sub: '60-90 min session' },
    { label: '5:00 PM',  sub: '60-90 min session' },
  ],
  default: [
    { label: 'Morning',   sub: '7:00am – 12:00pm' },
    { label: 'Afternoon', sub: '12:00pm – 5:00pm' },
    { label: 'Evening',   sub: '5:00pm – 9:00pm' },
  ],
}

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (date: string, time: string) => void
  venueTimeType?: VenueTimeType
  venueName?: string
  dateOnly?: boolean
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function friendlyDate(y: number, m: number, d: number) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dow = new Date(y, m, d).getDay()
  return `${days[dow]}, ${d} ${MONTH_NAMES[m].slice(0, 3)} ${y}`
}

export default function CalendarSheet({ open, onClose, onConfirm, venueTimeType = 'default', venueName, dateOnly = false }: Props) {
  const { dark } = useDarkMode()
  const today = new Date()
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate())

  const [step, setStep] = useState<'date' | 'time'>('date')
  const [displayYear, setDisplayYear] = useState(today.getFullYear())
  const [displayMonth, setDisplayMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setStep('date'); setSelectedDay(null); setSelectedTime(null) }
  }, [open])

  const surface  = dark ? '#1C1C1C' : '#FFFFFF'
  const bg       = dark ? '#0F0F0F' : '#F8F8F8'
  const ink      = dark ? '#F0F0F0' : '#1A1A1A'
  const muted    = dark ? '#888' : '#888888'
  const border   = dark ? '#2A2A2A' : '#EEEEEE'

  const daysInMonth = getDaysInMonth(displayYear, displayMonth)
  const firstDow    = getFirstDayOfWeek(displayYear, displayMonth)

  const canGoPrev = !(displayYear === today.getFullYear() && displayMonth === today.getMonth())
  const canGoNext = !(displayYear === maxDate.getFullYear() && displayMonth === maxDate.getMonth())

  const prevMonth = () => {
    if (!canGoPrev) return
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1) }
    else setDisplayMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (!canGoNext) return
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1) }
    else setDisplayMonth(m => m + 1)
    setSelectedDay(null)
  }

  const isDisabled = (d: number) => {
    const cellDate = new Date(displayYear, displayMonth, d)
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return cellDate < todayMid || cellDate > maxDate
  }

  const slots = TIME_SLOTS[venueTimeType]
  const selectedDateStr = selectedDay ? friendlyDate(displayYear, displayMonth, selectedDay) : ''

  const dialogRef = useDialogFocus(open, onClose)
  if (!open) return null

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Choose booking date and time" className="fixed inset-0 z-[100] flex flex-col justify-end" style={{ maxWidth: 430, margin: '0 auto', left: 0, right: 0 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative rounded-t-[28px] overflow-hidden"
        style={{ background: surface, maxHeight: '92vh', overflowY: 'auto' }}>

        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full" style={{ background: border }} />
        </div>

        <div className="flex items-center justify-between px-5 pb-4">
          <div>
            <p className="text-[18px] font-black" style={{ color: ink }}>
              {step === 'date' ? 'Pick a Date' : 'Pick a Time'}
            </p>
            {venueName && <p className="text-[12px] mt-0.5" style={{ color: muted }}>{venueName}</p>}
          </div>
          <button aria-label="Close" onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: bg }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {step === 'date' ? (
          <>
            <div className="flex items-center justify-between px-5 mb-4">
              <button aria-label="Previous month" onClick={prevMonth}
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{ background: canGoPrev ? bg : 'transparent', opacity: canGoPrev ? 1 : 0.3 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <p className="text-[16px] font-black" style={{ color: ink }}>
                {MONTH_NAMES[displayMonth]} {displayYear}
              </p>
              <button aria-label="Next month" onClick={nextMonth}
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{ background: canGoNext ? bg : 'transparent', opacity: canGoNext ? 1 : 0.3 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 px-4 mb-2">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[12px] font-bold py-1" style={{ color: muted }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 px-4 gap-y-1 mb-5">
              {Array.from({ length: firstDow }).map((_, i) => <div key={'e' + i} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1
                const disabled = isDisabled(d)
                const isToday = d === today.getDate() && displayMonth === today.getMonth() && displayYear === today.getFullYear()
                const selected = d === selectedDay
                return (
                  <button disabled={disabled} key={d} onClick={() => { if (!disabled) setSelectedDay(d) }}
                    className="flex items-center justify-center rounded-full mx-auto text-[14px] transition-all"
                    style={{
                      width: 38, height: 38,
                      background: selected ? RED : isToday ? RED + '18' : 'transparent',
                      color: selected ? '#fff' : disabled ? border : isToday ? RED : ink,
                      fontWeight: selected || isToday ? 800 : 600,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}>
                    {d}
                  </button>
                )
              })}
            </div>

            <div className="px-5 pb-8">
              <button
                disabled={!selectedDay} onClick={() => {
                  if (!selectedDay) return
                  if (dateOnly) onConfirm(selectedDateStr, '')
                  else setStep('time')
                }}
                className="w-full rounded-full py-4 text-[15px] font-black text-white"
                style={{ background: selectedDay ? RED : RED + '50' }}>
                {selectedDay ? (dateOnly ? 'Confirm — ' + selectedDateStr : 'Continue — ' + selectedDateStr) : 'Select a date to continue'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep('date')}
              className="flex items-center gap-2 px-5 mb-4 text-[13px] font-bold"
              style={{ color: muted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              {selectedDateStr}
            </button>

            <div className="mx-5 mb-4 flex items-center gap-2 rounded-full px-4 py-2.5 w-fit"
              style={{ background: RED + '15', border: '1.5px solid ' + RED }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="text-[13px] font-black" style={{ color: RED }}>{selectedDateStr}</span>
            </div>

            <p className="px-5 text-[14px] font-bold mb-3" style={{ color: ink }}>
              {venueTimeType === 'cinema' ? 'Choose a showtime' : 'Choose a time of day'}
            </p>

            <div className="px-5 flex flex-col gap-2 mb-6">
              {slots.map(slot => {
                const active = selectedTime === slot.label
                return (
                  <button key={slot.label} onClick={() => setSelectedTime(slot.label)}
                    className="flex items-center justify-between rounded-[16px] px-4 py-3.5"
                    style={{
                      background: active ? RED + '12' : bg,
                      border: '2px solid ' + (active ? RED : border),
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: active ? RED : muted }}>
                        {active && <div className="h-2.5 w-2.5 rounded-full" style={{ background: RED }} />}
                      </div>
                      <span className="text-[14px] font-bold" style={{ color: ink }}>{slot.label}</span>
                    </div>
                    <span className="text-[12px]" style={{ color: muted }}>{slot.sub}</span>
                  </button>
                )
              })}
            </div>

            <div className="px-5 pb-10">
              <button
                disabled={!selectedDay || !selectedTime} onClick={() => {
                  if (selectedDay && selectedTime) onConfirm(selectedDateStr, selectedTime)
                }}
                className="w-full rounded-full py-4 text-[15px] font-black text-white"
                style={{ background: selectedTime ? RED : RED + '50' }}>
                {selectedTime ? 'Confirm — ' + selectedTime : 'Select a time to confirm'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
