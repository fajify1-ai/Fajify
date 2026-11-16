import { useState, useEffect } from 'react'

export type Booking = {
  id: string
  venueId: string
  name: string
  venue: string
  date: string
  image: string
  price: string
  status: 'Upcoming' | 'Completed' | 'Cancelled'
  type: string
  hasTransport: boolean
  transportType?: string
  location?: { name: string; address: string }
  qrValue: string
  ref: string
  guests: number
}

const bookings: Booking[] = []
const listeners = new Set<() => void>()
function notify() { listeners.forEach(fn => fn()) }

export function addBooking(b: Booking) {
  if (bookings.some(booking => booking.id === b.id)) return
  bookings.unshift(b)
  notify()
}

export function useBookings() {
  const [, tick] = useState(0)
  useEffect(() => {
    const cb = () => tick(n => n + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])
  return [...bookings]
}

export function cancelBooking(id: string) {
  const booking = bookings.find(booking => booking.id === id)
  if (booking) { booking.status = 'Cancelled'; notify() }
}
