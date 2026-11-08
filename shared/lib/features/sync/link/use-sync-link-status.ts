import { useEffect, useState } from "react"
import {
  getSyncLinkStatus,
  subscribeSyncLinkStatus,
  type SyncLinkStatus
} from "./sync-link-status.ts"

export function useSyncLinkStatus(): SyncLinkStatus {
  const [status, setStatus] = useState<SyncLinkStatus>(() => getSyncLinkStatus())
  useEffect(() => {
    return subscribeSyncLinkStatus(() => {
      setStatus(getSyncLinkStatus())
    })
  }, [])
  return status
}
