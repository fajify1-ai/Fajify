import { useState, type Dispatch, type SetStateAction } from 'react'

/** In-memory settings are isolated by merchant, never shared with a server. */
export function useBusinessState<T>(businessId: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [values, setValues] = useState<Record<string, T>>({})
  const setValue: Dispatch<SetStateAction<T>> = update => setValues(previous => ({
    ...previous,
    [businessId]: typeof update === 'function'
      ? (update as (value: T) => T)(previous[businessId] ?? initial)
      : update,
  }))
  return [values[businessId] ?? initial, setValue]
}
