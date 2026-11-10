import { useEffect, useState } from "react"
import {
  SYNC_DEVICE_IDENTITY_KEY,
  SYNC_DISCOVERY_CACHE_KEY,
  SYNC_FAMILY_MEMBERSHIP_KEY,
  SYNC_ROSTER_STORAGE_KEY
} from "../workdir/storage-keys"
import { loadSyncPickerSummary, type SyncPickerSummary } from "./sync-picker-summary.ts"

const EMPTY: SyncPickerSummary = {
  deviceId: "",
  displayName: "",
  browser: "unknown",
  familyId: null,
  connectionCount: 0
}

export function useSyncPickerSummary(): SyncPickerSummary {
  const [summary, setSummary] = useState<SyncPickerSummary>(EMPTY)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      void loadSyncPickerSummary().then((next) => {
        if (!cancelled) {
          setSummary(next)
        }
      })
    }
    refresh()
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local") {
        return
      }
      if (
        SYNC_DEVICE_IDENTITY_KEY in changes ||
        SYNC_FAMILY_MEMBERSHIP_KEY in changes ||
        SYNC_DISCOVERY_CACHE_KEY in changes ||
        SYNC_ROSTER_STORAGE_KEY in changes
      ) {
        refresh()
      }
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => {
      cancelled = true
      chrome.storage.onChanged.removeListener(onChanged)
    }
  }, [])

  return summary
}
