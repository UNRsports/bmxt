import { useCallback, useEffect, useRef, useState } from "react"
import { activateModeToolbar, deactivateModeToolbar } from "../mode-toolbar-order"
import type { ModeToolbarId } from "../mode-toolbar-order"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import type { DetailBarId } from "../detail-bar-focus"
import type { SessionPickerState, PickerSlotId } from "../../side-picker/session/session-pickers"

export type PickerManagerDeps = {
  sessionId: string
  sessionPickers: SessionPickerState
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
  ) => void
  paneFocus: PaneFocusTarget
  onPaneFocusChange: (target: PaneFocusTarget) => void
  detailBarId: DetailBarId | null
  onDetailBarIdChange: (update: React.SetStateAction<DetailBarId | null>) => void
  modeToolbarOrder: ModeToolbarId[]
  onModeToolbarOrderChange: (update: React.SetStateAction<ModeToolbarId[]>) => void
  navArmed: boolean
  translateEnabled: boolean
}

export function usePickerManager(deps: PickerManagerDeps) {
  const tabPicker = deps.sessionPickers.tabs
  const searchListPicker = deps.sessionPickers.search
  const domListPicker = deps.sessionPickers.dom
  const settingListPicker = deps.sessionPickers.setting

  const setTabPicker = useCallback(
    (forSessionId: string, v: any) => {
      deps.setSessionPickerSlot(forSessionId, "tabs", v)
    },
    [deps]
  )
  const setSearchListPicker = useCallback(
    (forSessionId: string, v: any) => {
      deps.setSessionPickerSlot(forSessionId, "search", v)
    },
    [deps]
  )
  const setDomListPicker = useCallback(
    (forSessionId: string, v: any) => {
      deps.setSessionPickerSlot(forSessionId, "dom", v)
    },
    [deps]
  )
  const setSettingListPicker = useCallback(
    (forSessionId: string, v: any) => {
      deps.setSessionPickerSlot(forSessionId, "setting", v)
    },
    [deps]
  )

  const sidePickerOpen =
    tabPicker !== null ||
    searchListPicker !== null ||
    domListPicker !== null ||
    settingListPicker !== null

  useEffect(() => {
    if (deps.paneFocus === "detailBar" && deps.detailBarId === null) {
      const fallback = deps.modeToolbarOrder[deps.modeToolbarOrder.length - 1] ?? null
      if (fallback !== null) {
        deps.onDetailBarIdChange(fallback)
        return
      }
      deps.onPaneFocusChange("terminal")
      return
    }
    if (deps.paneFocus === "tabs" && tabPicker === null) {
      deps.onPaneFocusChange("terminal")
      deps.onDetailBarIdChange(null)
    } else if (deps.paneFocus === "search" && searchListPicker === null) {
      deps.onPaneFocusChange("terminal")
      deps.onDetailBarIdChange(null)
    } else if (deps.paneFocus === "dom" && domListPicker === null) {
      deps.onPaneFocusChange("terminal")
      deps.onDetailBarIdChange(null)
    } else if (deps.paneFocus === "setting" && settingListPicker === null) {
      deps.onPaneFocusChange("terminal")
      deps.onDetailBarIdChange(null)
    } else if (deps.paneFocus === "detailBar" && deps.detailBarId !== null) {
      if (deps.detailBarId === "tabs" && tabPicker === null) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      } else if (deps.detailBarId === "search" && searchListPicker === null) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      } else if (deps.detailBarId === "dom" && domListPicker === null) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      } else if (deps.detailBarId === "setting" && settingListPicker === null) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      } else if (deps.detailBarId === "nav" && !deps.navArmed) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      } else if (deps.detailBarId === "translate" && !deps.translateEnabled) {
        deps.onPaneFocusChange("terminal")
        deps.onDetailBarIdChange(null)
      }
    }
  }, [
    deps.detailBarId,
    domListPicker,
    deps.modeToolbarOrder,
    deps.navArmed,
    deps.onPaneFocusChange,
    deps.paneFocus,
    searchListPicker,
    deps.onDetailBarIdChange,
    settingListPicker,
    tabPicker,
    deps.translateEnabled
  ])

  return {
    tabPicker,
    searchListPicker,
    domListPicker,
    settingListPicker,
    setTabPicker,
    setSearchListPicker,
    setDomListPicker,
    setSettingListPicker,
    sidePickerOpen
  }
}
