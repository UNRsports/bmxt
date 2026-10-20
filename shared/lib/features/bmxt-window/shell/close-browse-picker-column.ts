import type { Dispatch, SetStateAction } from "react"
import type { JobRunner } from "../../job"
import { tDom } from "../../setting/i18n/ns/dom"
import { tSearch } from "../../setting/i18n/ns/search"
import { tSetting } from "../../setting/i18n/ns/setting"
import { tTabs } from "../../setting/i18n/ns/tabs"
import type { UiLocale } from "../../setting/locale"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import { closeTabPickerEngineForSession } from "../../tabs/engine"
import type { PickerDetailBarId } from "../detail-bar-focus"
import { deactivateModeToolbar, type ModeToolbarId } from "../mode-toolbar-order"

export type CloseBrowsePickerColumnDeps = {
  sessionId: string
  locale: UiLocale
  jobRunner: JobRunner
  isTabPickerOpen: boolean
  isSearchPickerOpen: boolean
  isDomPickerOpen: boolean
  isSettingPickerOpen: boolean
  setTabPicker: (sessionId: string, state: null) => void
  setSearchListPicker: (sessionId: string, state: null) => void
  setDomListPicker: (sessionId: string, state: null) => void
  closeSettingPickerColumn: () => void
  setModeToolbarOrder: Dispatch<SetStateAction<ModeToolbarId[]>>
  activatePaneFocus: (target: PaneFocusTarget) => void
  clearSearchLoadingProgress: () => void
}

/** EN: Close the browse column for `slot` (same effect as `<cmd> -exit -list`). */
export function closeBrowsePickerColumn(
  slot: PickerDetailBarId,
  deps: CloseBrowsePickerColumnDeps
): string {
  switch (slot) {
    case "tabs": {
      if (!deps.isTabPickerOpen) {
        return tTabs("tabs.picker.notOpen", deps.locale)
      }
      closeTabPickerEngineForSession(deps.sessionId)
      deps.setTabPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
      deps.activatePaneFocus("terminal")
      return tTabs("tabs.picker.closed", deps.locale)
    }
    case "search": {
      const hadActiveJob = deps.jobRunner.isActive("search-list")
      if (hadActiveJob) {
        deps.jobRunner.cancel("search-list")
      }
      deps.clearSearchLoadingProgress()
      if (!deps.isSearchPickerOpen) {
        if (hadActiveJob) {
          return tSearch("search.picker.cancelled", deps.locale)
        }
        return tSearch("search.picker.notOpen", deps.locale)
      }
      deps.setSearchListPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
      deps.activatePaneFocus("terminal")
      return tSearch("search.picker.closed", deps.locale)
    }
    case "dom": {
      const hadActiveDomJob = deps.jobRunner.isActive("dom-list")
      if (hadActiveDomJob) {
        deps.jobRunner.cancel("dom-list")
      }
      if (!deps.isDomPickerOpen) {
        return tDom("dom.picker.notOpen", deps.locale)
      }
      deps.setDomListPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
      deps.activatePaneFocus("terminal")
      return tDom("dom.picker.closed", deps.locale)
    }
    case "setting": {
      if (!deps.isSettingPickerOpen) {
        return tSetting("setting.picker.notOpen", deps.locale)
      }
      deps.closeSettingPickerColumn()
      return tSetting("setting.picker.closed", deps.locale)
    }
  }
}
