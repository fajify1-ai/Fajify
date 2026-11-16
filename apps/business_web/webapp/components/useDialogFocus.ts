import { useEffect, useRef } from 'react'
export function useDialogFocus(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const root = ref.current
    if (!root) return
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
    controls()[0]?.focus()
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const elements = controls(), first = elements[0], last = elements[elements.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    root.addEventListener('keydown', handle)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { root.removeEventListener('keydown', handle); document.body.style.overflow = overflow; previous?.focus() }
  }, [open])
  return ref
}
