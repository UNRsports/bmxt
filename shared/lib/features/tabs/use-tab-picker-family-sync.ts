import { useEffect } from "react"
import { familySignalTargetsTabPicker } from "../sync/bus/family-signal-first.ts"
import { getSyncService } from "../sync/facade/sync-service.ts"

/**
 * EN: Refresh open tab pickers only when Family tabs_changed carries first-command `"tab"`.
 * JA: Family tabs_changed の第一コマンド符号が `"tab"` のときだけ tab picker を再取得する。
 */
export function useTabPickerFamilySync(
  scheduleRefresh: () => void,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }
    return getSyncService().subscribeTabsChanged((signal) => {
      if (!familySignalTargetsTabPicker(signal.first)) {
        return
      }
      scheduleRefresh()
    })
  }, [enabled, scheduleRefresh])
}
