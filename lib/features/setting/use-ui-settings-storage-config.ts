import { useCallback, useEffect, useState } from "react"
import { UI_SETTINGS_STORAGE_CONFIG_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_SETTINGS_STORAGE_CONFIG,
  loadUiSettingsStorageConfig,
  type UiSettingsStorageConfig
} from "./settings-storage-config"

export function useUiSettingsStorageConfig(): UiSettingsStorageConfig {
  const [config, setConfig] = useState<UiSettingsStorageConfig>(DEFAULT_UI_SETTINGS_STORAGE_CONFIG)

  const reloadConfig = useCallback(async () => {
    const loaded = await loadUiSettingsStorageConfig()
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
      if (!(UI_SETTINGS_STORAGE_CONFIG_KEY in changes)) {
        return
      }
      void reloadConfig()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [reloadConfig])

  return config
}
