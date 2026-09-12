import { useEffect, useState } from "react"
import {
  resolveHostUiFormFactor,
  type HostUiFormFactor,
  type HostUiMode
} from "../../setting/host-ui-mode"
import { detectAndroidPlatform } from "./detect-android-platform"

export type UseHostUiFormFactorResult = {
  formFactor: HostUiFormFactor
  /**
   * EN: Soft extra-keys bar — shown in mobile form factor only.
   *     Same gate as pointer candidate pick / outside dismiss in BmxtShell.
   */
  showExtraKeys: boolean
  platformReady: boolean
}

/**
 * EN: Resolve effective desktop/mobile UI from preference + Android detect.
 * JA: 設定と Android 検出から desktop / mobile を解決する。
 *     mobile: ExtraKeys・候補タップ確定・候補外タップ dismiss。
 *     desktop: 0.8.0 相当のキーボード中心候補操作。
 */
export function useHostUiFormFactor(mode: HostUiMode): UseHostUiFormFactorResult {
  const [isAndroid, setIsAndroid] = useState(false)
  const [platformReady, setPlatformReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void detectAndroidPlatform().then((android) => {
      if (!cancelled) {
        setIsAndroid(android)
        setPlatformReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const formFactor = resolveHostUiFormFactor(mode, isAndroid)
  return {
    formFactor,
    showExtraKeys: formFactor === "mobile",
    platformReady
  }
}
