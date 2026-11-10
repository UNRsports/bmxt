import { useEffect, useState } from "react"
import {
  getSyncWizardState,
  subscribeSyncWizard,
  type SyncWizardState
} from "./sync-wizard-state.ts"
import {
  getSyncConnectPending,
  subscribeSyncConnectPending,
  type SyncConnectPending
} from "../connect/sync-connect-pending.ts"

export function useSyncWizardState(): SyncWizardState {
  const [state, setState] = useState<SyncWizardState>(() => getSyncWizardState())
  useEffect(() => {
    return subscribeSyncWizard(() => {
      setState(getSyncWizardState())
    })
  }, [])
  return state
}

export function useSyncConnectPending(): SyncConnectPending | null {
  const [pending, setPending] = useState<SyncConnectPending | null>(() =>
    getSyncConnectPending()
  )
  useEffect(() => {
    return subscribeSyncConnectPending(() => {
      setPending(getSyncConnectPending())
    })
  }, [])
  return pending
}
