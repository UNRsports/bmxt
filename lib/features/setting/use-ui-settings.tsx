import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react"
import { UI_SETTINGS_KEY } from "../extension-storage/keys"
import type { UiAppearance } from "./appearance"
import { DEFAULT_UI_LOCALE, type UiLocale } from "./locale"
import { loadUiSettings, type UiSettings } from "./settings"

type UiSettingsContextValue = {
  settings: UiSettings
  setLocale: (locale: UiLocale) => void
  setAppearance: (patch: Partial<UiAppearance>) => void
  replaceSettings: (next: UiSettings) => void
  reloadSettings: () => Promise<void>
}

const UiSettingsContext = createContext<UiSettingsContextValue | null>(null)

const INITIAL: UiSettings = {
  locale: DEFAULT_UI_LOCALE,
  appearance: {
    fg: null,
    bgColor: null,
    fontSize: null,
    fontFamily: null,
    bgImageDataUrl: null,
    editPicker: false,
    searchHitHighlightBg: null,
    searchJumpHighlightBg: null,
    picker: {
      fg: null,
      bgColor: null,
      fontSize: null,
      fontFamily: null,
      bgImageDataUrl: null
    }
  }
}

export function UiSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>(INITIAL)

  const reloadSettings = useCallback(async () => {
    const loaded = await loadUiSettings()
    setSettings(loaded)
  }, [])

  useEffect(() => {
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area !== "local") {
        return
      }
      if (!(UI_SETTINGS_KEY in changes)) {
        return
      }
      void reloadSettings()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [reloadSettings])

  const setLocale = useCallback((locale: UiLocale) => {
    setSettings((prev) => ({ ...prev, locale }))
  }, [])

  const setAppearance = useCallback((patch: Partial<UiAppearance>) => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...patch }
    }))
  }, [])

  const replaceSettings = useCallback((next: UiSettings) => {
    setSettings(next)
  }, [])

  const value = useMemo(
    () => ({
      settings,
      setLocale,
      setAppearance,
      replaceSettings,
      reloadSettings
    }),
    [settings, setLocale, setAppearance, replaceSettings, reloadSettings]
  )

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>
}

export function useUiSettings(): UiSettingsContextValue {
  const ctx = useContext(UiSettingsContext)
  if (!ctx) {
    throw new Error("useUiSettings must be used within UiSettingsProvider")
  }
  return ctx
}

export function useUiLocale(): UiLocale {
  return useUiSettings().settings.locale
}
