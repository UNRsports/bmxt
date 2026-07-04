import type { ListResult } from "../command-line/list-output/types.ts"
import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import { mountTabPickerLoadingColumn } from "../bmxt-window/shell/command-dispatch/open-tab-picker-column.ts"
import {
  activateModeToolbar,
  deactivateModeToolbar
} from "../bmxt-window/mode-toolbar-order.ts"
import {
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../tabs/engine"
import {
  buildTabPickerRowsBundle,
  resolveInitialTabPickerHighlightIndex
} from "../tabs/picker-rows.ts"
import { settingTokenForPageActiveMode } from "../tabs/page-active-setting.ts"
import { createSettingListPickerState } from "../setting/setting-list-picker-state.ts"
import { tTabs } from "../setting/i18n/ns/tabs.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import { tDom } from "../setting/i18n/ns/dom.ts"
import { tSession } from "../setting/i18n/ns/session.ts"
import { tSetting } from "../setting/i18n/ns/setting.ts"
import { tPipe } from "../setting/i18n/ns/pipe.ts"
import { tError } from "../setting/i18n/ns/error.ts"
import type { UiLocale } from "../setting/locale.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../command-line/compound/classify-outcome.ts"
import type { SegmentOutcome } from "../command-line/compound/types.ts"
import { domPickerLinesFromListResult } from "./from-list-result/dom-lines.ts"
import { pickerEntriesFromSearchListResult } from "./from-list-result/search-entries.ts"
import type { PickerConsumerOptions } from "./match.ts"
import { resolvePickerFamily } from "./resolve-family.ts"

/**
 * EN: Open the appropriate picker UI from pipe stdin `ListResult`.
 * JA: パイプ stdin の `ListResult` から対応する picker UI を開く。
 */
export async function openPickerFromListResult(
  listResult: ListResult,
  options: PickerConsumerOptions,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const resolved = resolvePickerFamily(listResult)
  if (resolved.ok === false) {
    if (resolved.reason === "mixed") {
      return segmentFailure("runtime", [tPipe("pipe.picker.mixedKinds", locale)])
    }
    return segmentFailure("runtime", [tPipe("pipe.picker.empty", locale)])
  }

  switch (resolved.family) {
    case "tabs":
      return openTabsPicker(options.showUrl, deps, locale)
    case "search":
      return openSearchPicker(listResult, deps, locale)
    case "dom":
      return openDomPicker(listResult, deps, locale)
    case "session":
      return openSessionPicker(deps, locale)
    case "setting":
      return openSettingPicker(deps, locale)
    default: {
      const _exhaustive: never = resolved.family
      return segmentFailure("runtime", [
        tError("error.generic", locale, { message: String(_exhaustive) })
      ])
    }
  }
}

async function openTabsPicker(
  showUrl: boolean,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  deps.setTabPicker(deps.sessionId, mountTabPickerLoadingColumn(deps.sessionId, showUrl))
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
  try {
    const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(
      showUrl,
      deps.uiSettings.locale
    )
    const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
    const pageActiveToken = settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
    deps.setTabPicker(
      deps.sessionId,
      openTabPickerEngineForSession(deps.sessionId, { rows, showUrl, initialHi })
    )
    deps.activatePaneFocus("tabs")
    return segmentSuccess([tTabs("tabs.picker.hint", locale, { token: pageActiveToken })])
  } catch (e) {
    if (deps.tabPickerRef.current?.rows.length === 0) {
      closeTabPickerEngineForSession(deps.sessionId)
      deps.setTabPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
    }
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [tError("error.generic", locale, { message })], message)
  }
}

function openSearchPicker(
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale
): SegmentOutcome {
  const { entries, pattern, emptyResultLines } = pickerEntriesFromSearchListResult(listResult)
  deps.setSearchListPicker(deps.sessionId, {
    phase: "results",
    progressLines: [],
    entries,
    pattern,
    emptyResultLines
  })
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "search"))
  deps.activatePaneFocus("search")
  return segmentSuccess([tSearch("search.picker.opened", locale)])
}

function openDomPicker(
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale
): SegmentOutcome {
  const projected = domPickerLinesFromListResult(listResult)
  deps.setDomListPicker(deps.sessionId, {
    kind: "lines",
    lines: projected.lines,
    commandLine: projected.commandLine,
    targetTabId: projected.targetTabId,
    jumpPaths: projected.jumpPaths,
    headerLineCount: projected.headerLineCount,
    pickerMode: projected.pickerMode,
    flavor: projected.flavor,
    showTag: projected.showTag,
    pattern: projected.pattern
  })
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "dom"))
  deps.activatePaneFocus("dom")
  return segmentSuccess([tDom("dom.listPicker", locale)])
}

function openSessionPicker(deps: CommandDispatchDeps, locale: UiLocale): SegmentOutcome {
  deps.openSessionListPicker()
  deps.focusPrompt()
  return segmentSuccess([tSession("session.picker.hint", locale)])
}

function openSettingPicker(deps: CommandDispatchDeps, locale: UiLocale): SegmentOutcome {
  const state = createSettingListPickerState(deps.uiSettings)
  deps.setSettingListPicker(deps.sessionId, state)
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "setting"))
  deps.activatePaneFocus("setting")
  return segmentSuccess([tSetting("setting.picker.hint", locale)])
}
