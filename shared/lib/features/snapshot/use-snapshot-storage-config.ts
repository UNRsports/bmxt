import { useCallback, useEffect, useState } from "react"
import { SNAPSHOT_STORAGE_CONFIG_KEY } from "../extension-storage/keys"
import {
  DEFAULT_SNAPSHOT_STORAGE_CONFIG,
  loadSnapshotStorageConfig,
  type SnapshotStorageConfig
} from "./snapshot-storage-config"

export function useSnapshotStorageConfig(): SnapshotStorageConfig {
  const [config, setConfig] = useState<SnapshotStorageConfig>(DEFAULT_SNAPSHOT_STORAGE_CONFIG)

  const reloadConfig = useCallback(async () => {
    const loaded = await loadSnapshotStorageConfig()
    setConfig(loaded)
  }, [])

  useEffect(() => {
    void reloadConfig()
  }, [reloadConfig])

  useEffect(() => {
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area !== "local") {
        return
      }
      if (!(SNAPSHOT_STORAGE_CONFIG_KEY in changes)) {
        return
      }
      void reloadConfig()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [reloadConfig])

  return config
}
