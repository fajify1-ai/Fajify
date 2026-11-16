import { useState, useEffect } from 'react'

const savedIds = new Set<string>()
const listeners = new Set<() => void>()

function notify() { listeners.forEach(fn => fn()) }

export function useSaved() {
  const [, tick] = useState(0)
  useEffect(() => {
    const cb = () => tick(n => n + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])
  return {
    isSaved: (id: string) => savedIds.has(id),
    toggle: (id: string) => {
      if (savedIds.has(id)) savedIds.delete(id)
      else savedIds.add(id)
      notify()
    },
    savedSet: savedIds,
  }
}
