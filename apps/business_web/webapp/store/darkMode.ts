import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

let mode: ThemeMode = 'system'
const listeners = new Set<() => void>()

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolvedDark(): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemPrefersDark()
}

function apply() {
  const dark = resolvedDark()
  document.documentElement.setAttribute('data-dark', dark ? 'true' : 'false')
  listeners.forEach(fn => fn())
}

// Listen to OS preference changes when mode is 'system'
const mq = window.matchMedia('(prefers-color-scheme: dark)')
mq.addEventListener('change', () => { if (mode === 'system') apply() })

// Apply on load
apply()

export function useDarkMode() {
  const [, tick] = useState(0)

  useEffect(() => {
    const cb = () => tick(n => n + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  return {
    dark: resolvedDark(),
    mode,
    setMode: (m: ThemeMode) => { mode = m; apply() },
    toggle: () => {
      mode = resolvedDark() ? 'light' : 'dark'
      apply()
    },
  }
}
