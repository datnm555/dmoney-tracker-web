import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { getTransactionSuggestions } from '../../api/transactionApi'
import type { TransactionSuggestionResponse } from '../../api/types'

const DEBOUNCE_MS = 250
const MIN_CHARS = 2
const LIMIT = 8

/**
 * Debounced "suggestions from past transactions" for the content field. Create mode only
 * (pass enabled=false otherwise). Failures are silent; stale responses are ignored.
 */
export function useContentSuggestions(
  query: string,
  enabled: boolean,
  onPick: (suggestion: TransactionSuggestionResponse) => void,
) {
  const [items, setItems] = useState<TransactionSuggestionResponse[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const focusedRef = useRef(false)
  // Text just filled by a pick: it must not trigger another lookup.
  const skipRef = useRef<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!enabled || q.length < MIN_CHARS || skipRef.current === query) {
      setItems([])
      setOpen(false)
      return
    }
    skipRef.current = null
    let cancelled = false
    const timer = setTimeout(() => {
      getTransactionSuggestions(q, LIMIT)
        .then((rows) => {
          if (cancelled) return
          setItems(rows)
          setHighlight(0)
          setOpen(rows.length > 0 && focusedRef.current)
        })
        .catch(() => {
          if (cancelled) return
          setItems([])
          setOpen(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, enabled])

  const visible = open && items.length > 0

  const pick = useCallback(
    (suggestion: TransactionSuggestionResponse) => {
      skipRef.current = suggestion.content
      setOpen(false)
      onPick(suggestion)
    },
    [onPick],
  )

  const inputProps = {
    onFocus: () => {
      focusedRef.current = true
    },
    onBlur: () => {
      focusedRef.current = false
      // After a tick, so a click on a row still registers first.
      setTimeout(() => setOpen(false), 0)
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (!visible || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlight((h) => (h + 1) % items.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlight((h) => (h - 1 + items.length) % items.length)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        pick(items[Math.min(highlight, items.length - 1)])
      } else if (event.key === 'Escape') {
        // Close only the dropdown, not the dialog.
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
      }
    },
  }

  return { items, visible, highlight, setHighlight, pick, inputProps, markFocused: inputProps.onFocus }
}
