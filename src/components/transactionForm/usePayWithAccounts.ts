import { useEffect, useState } from 'react'
import { getAccounts } from '../../api/accountApi'
import type { AccountResponse } from '../../api/types'

export type PayWithStatus = "loading" | "ready" | "error";

/** Fetches the accounts once per modal open; a stale response is ignored. */
export function usePayWithAccounts(open: boolean): {
  status: PayWithStatus;
  accounts: AccountResponse[];
} {
  const [state, setState] = useState<{
    status: PayWithStatus;
    accounts: AccountResponse[];
  }>({
    status: "loading",
    accounts: [],
  });
  useEffect(() => {
    if (!open) return;
    let stale = false;
    setState({ status: "loading", accounts: [] });
    getAccounts()
      .then((accounts) => {
        if (!stale) setState({ status: "ready", accounts });
      })
      .catch(() => {
        if (!stale) setState({ status: "error", accounts: [] });
      });
    return () => {
      stale = true;
    };
  }, [open]);
  return state;
}
