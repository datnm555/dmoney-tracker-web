import { useEffect, useState } from 'react'
import { getAccounts } from '../../api/accountApi'
import type { AccountResponse } from '../../api/types'

export type PayWithStatus = 'loading' | 'ready' | 'error'

interface State {
  status: PayWithStatus
  accounts: AccountResponse[]
}

const LOADING: State = { status: 'loading', accounts: [] }

/** Fetches the accounts once per modal open; a stale response is ignored. */
export function usePayWithAccounts(open: boolean): State {
  const [state, setState] = useState<State>(LOADING)
  const [prevOpen, setPrevOpen] = useState(open)
  // Reset synchronously when `open` flips so no render (or effect) of the new
  // open ever sees the previous open's result.
  if (open !== prevOpen) {
    setPrevOpen(open)
    setState(LOADING)
  }
  useEffect(() => {
    if (!open) return
    let stale = false
    getAccounts()
      .then((accounts) => {
        if (!stale) setState({ status: 'ready', accounts })
      })
      .catch(() => {
        if (!stale) setState({ status: 'error', accounts: [] })
      })
    return () => {
      stale = true
    }
  }, [open])
  return state
}
