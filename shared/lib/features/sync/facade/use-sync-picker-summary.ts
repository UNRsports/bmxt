import { useCallback, useEffect, useState } from "react"
import {
  SYNC_DEVICE_IDENTITY_KEY,
  SYNC_FAMILY_MEMBERSHIP_KEY,
  SYNC_WORKDIR_CONFIG_KEY
} from "../../extension-storage/keys"
import { loadSyncPickerSummary, type SyncPickerSummary } from "./sync-picker-summary.ts"

const EMPTY: SyncPickerSummary = {
  deviceId: "",
  displayName: "",
  browser: "unknown",
  familyId: null,
  workdir: {
    enabled: false,
    paused: false,
    directoryName: null,
    lastPullAt: null,
    lastPushAt: null
  }
}

export function useSyncPickerSummary(): SyncPickerSummary {
  const [summary, setSummary] = useState<SyncPickerSummary>(EMPTY)

  const reload = useCallback(async () => {
    try {
      setSummary(await loadSyncPickerSummary())
    } catch {
      setSummary(EMPTY)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      if (
        SYNC_DEVICE_IDENTITY_KEY in changes ||
        SYNC_FAMILY_MEMBERSHIP_KEY in changes ||
        SYNC_WORKDIR_CONFIG_KEY in changes
      ) {
        void reload()
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [reload])

  return summary
}
