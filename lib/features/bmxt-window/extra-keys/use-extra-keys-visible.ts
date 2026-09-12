import { useEffect, useState } from "react"
import {
  resolveExtraKeysVisible,
  type ExtraKeysMode
} from "../../setting/extra-keys-mode"
import { detectAndroidPlatform } from "./detect-android-platform"

/** EN: Resolve whether the soft extra-keys bar should be shown. */
export function useExtraKeysVisible(mode: ExtraKeysMode): boolean {
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    let cancelled = false
    void detectAndroidPlatform().then((android) => {
      if (!cancelled) {
        setIsAndroid(android)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return resolveExtraKeysVisible(mode, isAndroid)
}
