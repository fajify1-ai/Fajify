import { useState, useEffect } from 'react'

export type CartItem = {
  key: string
  venueId: string
  venueName: string
  venueImage: string
  itemId: string
  name: string
  price: number
  image: string
  qty: number
}

const items = new Map<string, CartItem>()
const listeners = new Set<() => void>()

function notify() { listeners.forEach(fn => fn()) }

export function useCart() {
  const [, tick] = useState(0)
  useEffect(() => {
    const cb = () => tick(n => n + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  const list = Array.from(items.values())
  const totalQty = list.reduce((s, i) => s + i.qty, 0)
  const totalPrice = list.reduce((s, i) => s + i.price * i.qty, 0)

  return {
    items: list,
    totalQty,
    totalPrice,
    addItem(item: Omit<CartItem, 'key' | 'qty'>) {
      const key = `${item.venueId}__${item.itemId}`
      const existing = items.get(key)
      if (existing) items.set(key, { ...existing, qty: existing.qty + 1 })
      else items.set(key, { ...item, key, qty: 1 })
      notify()
    },
    removeItem(key: string) {
      const existing = items.get(key)
      if (!existing) return
      if (existing.qty <= 1) items.delete(key)
      else items.set(key, { ...existing, qty: existing.qty - 1 })
      notify()
    },
    deleteItem(key: string) {
      items.delete(key)
      notify()
    },
    clear() {
      items.clear()
      notify()
    },
    clearVenue(venueId: string) {
      for (const [key, item] of items) {
        if (item.venueId === venueId) items.delete(key)
      }
      notify()
    },
    venueItems(venueId: string) {
      return list.filter(i => i.venueId === venueId)
    },
  }
}
