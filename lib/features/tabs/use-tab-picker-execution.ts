import type { MutableRefObject } from "react"
import { useCallback } from "react"
import { logBmxtKey } from "../debug/key-log"
import { tTabs } from "../setting/i18n/ns/tabs"
import { useUiSettings } from "../setting/use-ui-settings"
import type { TabPickerRow } from "./picker-rows"
import { mapVisibleIndicesToPlanRows } from "./tab-picker-plan-rows"
import type { PickerReducerState } from "./state-machine"
import {
  validatePickerExecute,
  resolvePickerTarget,
  resolvePickerGroupTarget,
  resolvePickerNewWindowOrder,
  resolvePickerConfirmPlan,
  resolvePickerMovePlan,
  resolvePickerCreateGroupPlan
} from "./state-machine"
import {
  EXECUTION_REGISTRY,
  type ExecutionIntent,
  executeCloseAction,
  executeGroupAction,
  executeMoveAction,
  executeNewWindowAction
} from "./controller/execute-actions"
import { executeCreateNewGroupAction } from "./controller/create-new-group"
import { NEW_GROUP_COLORS, NEW_GROUP_LIST_SENTINEL } from "./tab-picker-overlay-constants"
import type { BulkSubMode, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { chromeTabGroupIdsFromMarkedGroupKeys } from "./tab-picker-keyboard"
import { implicitWindowIdFromPickerHi } from "./tab-picker-bulk-window"
import { resolvePickerExecutionTabIds } from "./picker-selected-tab-ids"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { pickerEntryAtVisibleHi } from "../side-picker/model/from-tab-row"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"

export type TabPickerExecutionParams = {
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  moveDestHi: number
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  bulkSubMode: BulkSubMode | null
  selectedTabIds: number[]
  groupChoices: GroupChoice[]
  groupPickIndex: number
  newGroupColorIndex: number
  newGroupTitle: string
  newGroupTabIdsRef: MutableRefObject<number[]>
  groupCreateInFlightRef: MutableRefObject<boolean>
  setActiveTabId: (id: number | null) => void
  setNewGroupTitle: (v: string) => void
  setNewGroupColorIndex: (v: number | ((n: number) => number)) => void
  setGroupNewPhase: (v: "tabs" | "meta") => void
  clearMarkedViaReducer: () => void
  onAppendLog?: (lines: string[]) => void | Promise<void>
  onRefreshRows?: () => Promise<void>
  setSearchMode: (v: boolean) => void
  setFilterQuery: (v: string) => void
  setBulkSubMode: (v: BulkSubMode | null) => void
  onNewTabUrlPanelDone?: () => void
  /** URL からタブ作成後、ピッカーでそのタブ行をハイライトする（refresh 前に呼ぶ） */
  onPickerHighlightCreatedTab?: (tabId: number) => void
}

export function useTabPickerExecution(p: TabPickerExecutionParams) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const {
    rows,
    visibleRowIndices,
    hi,
    moveDestHi,
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys,
    bulkSubMode,
    selectedTabIds,
    groupChoices,
    groupPickIndex,
    newGroupColorIndex,
    newGroupTitle,
    newGroupTabIdsRef,
    groupCreateInFlightRef,
    setActiveTabId,
    setNewGroupTitle,
    setNewGroupColorIndex,
    setGroupNewPhase,
    clearMarkedViaReducer,
    onAppendLog,
    onRefreshRows,
    setSearchMode,
    setFilterQuery,
    setBulkSubMode,
    onNewTabUrlPanelDone,
    onPickerHighlightCreatedTab
  } = p

  const closeSearch = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
  }, [setFilterQuery, setSearchMode])

  const confirmSelection = useCallback(async () => {
    if (visibleRowIndices.length === 0) {
      return
    }
    const confirmRows = mapVisibleIndicesToPlanRows(rows, visibleRowIndices)
    const plan = resolvePickerConfirmPlan(hi, confirmRows)
    if (!plan) {
      logBmxtKey("picker", "confirmSelection → no plan", { hi })
      return
    }
    const entry = pickerEntryAtVisibleHi(rows, visibleRowIndices, hi)
    logBmxtKey("picker", "confirmSelection → execute", {
      planKind: plan.kind,
      entrySource: entry?.source ?? null,
      entryUrl: entry?.url ?? null,
      ...(plan.kind === "activateTab"
        ? { tabId: plan.tabId, windowId: plan.windowId }
        : plan.kind === "focusWindow"
          ? { windowId: plan.windowId }
          : { windowId: plan.windowId, groupId: plan.groupId })
    })
    const activeId = await executePickerFocusPlan(plan)
    if (activeId !== null) {
      setActiveTabId(activeId)
    }
  }, [hi, rows, setActiveTabId, visibleRowIndices])

  const executeBulkClose = useCallback(async () => {
    try {
      await executeCloseAction({
        markedKind,
        markedWindowIds,
        selectedTabIds
      })
    } catch {
      /* ignore */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [clearMarkedViaReducer, markedKind, markedWindowIds, onRefreshRows, selectedTabIds])

  const executeBulkMove = useCallback(async () => {
    if (visibleRowIndices.length === 0 || selectedTabIds.length === 0) {
      return
    }
    const targetRows = mapVisibleIndicesToPlanRows(rows, visibleRowIndices)
    const target = resolvePickerTarget(moveDestHi, targetRows)
    if (!target) {
      return
    }
    const plan = resolvePickerMovePlan(markedKind, target, markedGroupKeys)
    if (!plan) {
      return
    }
    const toMove = [...selectedTabIds]
    if (toMove.length === 0) {
      return
    }
    try {
      await executeMoveAction({ plan, selectedTabIds: toMove })
    } catch {
      /* ignore */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [
    clearMarkedViaReducer,
    markedKind,
    markedGroupKeys,
    moveDestHi,
    onRefreshRows,
    rows,
    selectedTabIds,
      locale
    ]
  )

  const executeBulkGroup = useCallback(async () => {
    if (selectedTabIds.length === 0) {
      return
    }
    const resolved = resolvePickerGroupTarget(
      groupPickIndex,
      groupChoices.map((g) => ({ id: g.id })),
      NEW_GROUP_LIST_SENTINEL
    )
    if (!resolved) {
      return
    }
    try {
      await executeGroupAction({
        target: resolved,
        selectedTabIds,
        onOpenCreateNewMeta: () => {
          newGroupTabIdsRef.current = [...selectedTabIds]
          setNewGroupTitle("")
          setNewGroupColorIndex(0)
          setGroupNewPhase("meta")
        }
      })
    } catch {
      /* e.g. tabs in another window than the group */
    }
    if (resolved.createNew) {
      return
    }
    clearMarkedViaReducer()
    setGroupNewPhase("tabs")
    await onRefreshRows?.()
  }, [
    clearMarkedViaReducer,
    groupChoices,
    groupPickIndex,
    newGroupTabIdsRef,
    onRefreshRows,
    selectedTabIds,
    setGroupNewPhase,
    setNewGroupColorIndex,
    setNewGroupTitle
  ])

  const executeBulkNewWindow = useCallback(async () => {
    if (selectedTabIds.length === 0) {
      return
    }
    try {
      const tabs = await Promise.all(selectedTabIds.map((id) => chrome.tabs.get(id)))
      const base = resolvePickerNewWindowOrder(
        tabs
          .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
          .map((t) => ({ id: t.id, windowId: t.windowId ?? 0, index: t.index ?? 0 }))
      )
      const order = {
        orderedIds: base.orderedIds,
        tabGroupIdsToMoveAsUnits:
          markedKind === "group" ? chromeTabGroupIdsFromMarkedGroupKeys(markedGroupKeys) : []
      }
      await executeNewWindowAction({ selectedTabIds, order })
    } catch {
      /* e.g. incognito mismatch, tab already closed */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [clearMarkedViaReducer, markedGroupKeys, markedKind, onRefreshRows, selectedTabIds])

  const executeCreateNewGroup = useCallback(async () => {
    if (groupCreateInFlightRef.current) {
      return
    }
    const tabIds = newGroupTabIdsRef.current
    const color = NEW_GROUP_COLORS[newGroupColorIndex]
    if (color === undefined) {
      return
    }

    groupCreateInFlightRef.current = true
    try {
      const ok = await executeCreateNewGroupAction({
        tabIds,
        title: newGroupTitle,
        color,
        locale: locale,
        onAppendLog,
        resolveCreateGroupPlan: resolvePickerCreateGroupPlan
      })
      newGroupTabIdsRef.current = []
      if (ok) {
        clearMarkedViaReducer()
        setGroupNewPhase("tabs")
        await onRefreshRows?.()
      }
    } catch {
      /* handled in controller */
    } finally {
      groupCreateInFlightRef.current = false
    }
  }, [
    clearMarkedViaReducer,
    groupCreateInFlightRef,
    newGroupColorIndex,
    newGroupTabIdsRef,
    newGroupTitle,
    onAppendLog,
    onRefreshRows,
    setGroupNewPhase
  ])

  const executeOpenNewTabFromUrl = useCallback(
    (windowId: number, urlRaw: string) => {
      const url = normalizePickerOpenUrl(urlRaw)
      // tabs.create の index は 0 以上のみ（-1 は無効）。末尾追加は index を省略する。
      const props: chrome.tabs.CreateProperties = { windowId }
      if (url !== undefined) {
        props.url = url
      }

      const finish = (tabId: number) => {
        chrome.tabs.update(tabId, { active: true }, () => void chrome.runtime.lastError)
        setActiveTabId(tabId)
        chrome.windows.update(windowId, { focused: true }, () => void chrome.runtime.lastError)
        onPickerHighlightCreatedTab?.(tabId)
        onNewTabUrlPanelDone?.()
        void onRefreshRows?.()
      }

      const abortLogged = (lines: string[]) => {
        void onAppendLog?.(lines)
        onNewTabUrlPanelDone?.()
        void onRefreshRows?.()
      }

      chrome.tabs.create(props, (tab) => {
        const err = chrome.runtime.lastError
        if (!err && tab?.id !== undefined) {
          finish(tab.id)
          return
        }

        const primaryReason =
          err?.message ?? tTabs("tabs.picker.error.createNoResponse", locale)
        logBmxtKey("picker", "tabs.create(windowId) fallback", { primaryReason })

        const fallbackCreate: chrome.tabs.CreateProperties =
          url !== undefined ? { url, active: false } : { active: false }
        chrome.tabs.create(fallbackCreate, (tab2) => {
          const err2 = chrome.runtime.lastError
          if (err2 || tab2?.id === undefined) {
            abortLogged([
              tTabs("tabs.picker.error.newTabPrimary", locale, { message: primaryReason }),
              err2?.message
                ? tTabs("tabs.picker.error.newTabFallbackLine", locale, { message: err2.message })
                : tTabs("tabs.picker.error.newTabFallbackFailed", locale)
            ])
            return
          }
          chrome.tabs.move(tab2.id, { windowId, index: -1 }, (moved) => {
            const err3 = chrome.runtime.lastError
            if (err3 || moved?.id === undefined) {
              abortLogged([
                tTabs("tabs.picker.error.newTabPrimary", locale, { message: primaryReason }),
                tTabs("tabs.picker.error.newTabMoveFailed", locale, {
                  message: err3?.message ?? "unknown"
                })
              ])
              return
            }
            finish(moved.id)
          })
        })
      })
    },
    [
      onAppendLog,
      onNewTabUrlPanelDone,
      onPickerHighlightCreatedTab,
      onRefreshRows,
      setActiveTabId,
      locale
    ]
  )

  const runExecutionIntentForSnapshot = useCallback(
    async (intent: ExecutionIntent, snapshot: PickerReducerState, tabIds: number[]) => {
      const implicitWid = implicitWindowIdFromPickerHi(
        snapshot.markedKind,
        rows,
        visibleRowIndices,
        snapshot.hi
      )
      const execTabIds =
        intent === "executeReload" || intent === "executeNewWindow"
          ? resolvePickerExecutionTabIds(rows, visibleRowIndices, snapshot, implicitWid)
          : tabIds
      const v = validatePickerExecute(
        {
          hi: snapshot.hi,
          moveDestHi: snapshot.moveDestHi,
          markedKind: snapshot.markedKind,
          markedTabIds: snapshot.markedTabIds,
          markedWindowIds: snapshot.markedWindowIds,
          markedGroupKeys: snapshot.markedGroupKeys,
          bulkSubMode: snapshot.bulkSubMode
        },
        execTabIds.length,
        implicitWid
      )
      if (!v.ok) {
        setBulkSubMode(null)
        void onAppendLog?.([
          `error: ${v.reason ?? tTabs("tabs.picker.error.executeFailed", locale)}`
        ])
        return
      }
      let execMarkedKind = snapshot.markedKind
      let execMarkedWindowIds = snapshot.markedWindowIds
      if (intent === "executeClose" && snapshot.markedKind === null && implicitWid !== undefined) {
        execMarkedKind = "window"
        execMarkedWindowIds = [implicitWid]
      }
      const ctx: Parameters<(typeof EXECUTION_REGISTRY)[ExecutionIntent]>[0] = {
        markedKind: execMarkedKind,
        markedWindowIds: execMarkedWindowIds,
        selectedTabIds: execTabIds
      }
      if (intent === "executeMove") {
        const targetRows = mapVisibleIndicesToPlanRows(rows, visibleRowIndices)
        const target = resolvePickerTarget(snapshot.moveDestHi, targetRows)
        if (!target) {
          setBulkSubMode(null)
          return
        }
        const movePlan = resolvePickerMovePlan(execMarkedKind, target, snapshot.markedGroupKeys)
        if (!movePlan) {
          setBulkSubMode(null)
          return
        }
        ctx.movePlan = movePlan
      } else if (intent === "executeGroup") {
        const groupTarget = resolvePickerGroupTarget(
          groupPickIndex,
          groupChoices.map((g) => ({ id: g.id })),
          NEW_GROUP_LIST_SENTINEL
        )
        if (!groupTarget) {
          setBulkSubMode(null)
          return
        }
        ctx.groupTarget = groupTarget
        ctx.onOpenCreateNewMeta = () => {
          newGroupTabIdsRef.current = [...execTabIds]
          setNewGroupTitle("")
          setNewGroupColorIndex(0)
          setGroupNewPhase("meta")
        }
      } else if (intent === "executeNewWindow") {
        const tabs = await Promise.all(execTabIds.map((id) => chrome.tabs.get(id)))
        const base = resolvePickerNewWindowOrder(
          tabs
            .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
            .map((t) => ({ id: t.id, windowId: t.windowId ?? 0, index: t.index ?? 0 }))
        )
        ctx.newWindowOrder = {
          orderedIds: base.orderedIds,
          tabGroupIdsToMoveAsUnits:
            snapshot.markedKind === "group"
              ? chromeTabGroupIdsFromMarkedGroupKeys(snapshot.markedGroupKeys)
              : []
        }
      }
      try {
        await EXECUTION_REGISTRY[intent](ctx)
      } catch {
        setBulkSubMode(null)
        return
      }
      if (intent === "executeGroup" && ctx.groupTarget?.createNew) {
        return
      }
      clearMarkedViaReducer()
      setBulkSubMode(null)
      if (intent === "executeGroup") {
        setGroupNewPhase("tabs")
      }
      await onRefreshRows?.()
    },
    [
      clearMarkedViaReducer,
      groupChoices,
      groupPickIndex,
      onAppendLog,
      onRefreshRows,
      rows,
      setBulkSubMode,
      setGroupNewPhase,
      setNewGroupColorIndex,
      setNewGroupTitle,
      locale,
      visibleRowIndices
    ]
  )

  const runExecutionIntent = useCallback(
    async (intent: ExecutionIntent) => {
      await runExecutionIntentForSnapshot(
        intent,
        {
          hi,
          moveDestHi,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys,
          bulkSubMode
        },
        selectedTabIds
      )
    },
    [
      bulkSubMode,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      runExecutionIntentForSnapshot,
      selectedTabIds
    ]
  )

  return {
    closeSearch,
    confirmSelection,
    executeBulkClose,
    executeBulkMove,
    executeBulkGroup,
    executeBulkNewWindow,
    executeCreateNewGroup,
    executeOpenNewTabFromUrl,
    runExecutionIntent,
    runExecutionIntentForSnapshot
  }
}
