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
import {
  executeCreateGroupInPlaceAction,
  executeCreateNewGroupAction
} from "./controller/create-new-group"
import { NEW_GROUP_COLORS, NEW_GROUP_LIST_SENTINEL } from "./tab-picker-overlay-constants"
import type { BulkSubMode, GroupChoice, SelectKind } from "./tab-picker-overlay-types"
import { chromeTabGroupIdsFromMarkedGroupKeys } from "./tab-picker-keyboard"
import { implicitWindowIdFromPickerHi } from "./tab-picker-bulk-window"
import { resolvePickerExecutionTabIds } from "./picker-selected-tab-ids"
import { executePickerFocusPlan } from "../side-picker/model/focus-picker-entry"
import { pickerEntryAtVisibleHi } from "../side-picker/model/from-tab-row"
import { normalizePickerOpenUrl } from "../side-picker/model/normalize-picker-open-url"
import {
  buildRemoteMoveOp,
  classifyPickerSelection,
  runRemoteTabsOp
} from "./remote-picker-ops.ts"
import { sendSelectedTabsToFamilyPeer } from "./family-move-dest.ts"
import { resolveFamilySendDestination } from "./resolve-family-send-dest.ts"
import { expandSyncLogLines } from "../sync/facade/expand-sync-log.ts"

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
  moveCloseAfter: boolean
  variant: "default" | "groupNew"
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
    moveCloseAfter,
    variant,
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

    if (plan.kind === "activateTab") {
      const row = rows.find((r) => r.kind === "tab" && r.tabId === plan.tabId)
      if (row && row.kind === "tab" && row.remote && row.deviceId && row.peerTabId !== null && row.peerWindowId !== null) {
        await runRemoteTabsOp(row.deviceId, {
          kind: "activate",
          tabId: row.peerTabId,
          windowId: row.peerWindowId
        })
        setActiveTabId(row.tabId)
        return
      }
    }
    if (plan.kind === "focusWindow") {
      const row = rows.find((r) => r.kind === "window" && r.windowId === plan.windowId)
      if (row && row.kind === "window" && row.remote && row.deviceId && row.peerWindowId !== null) {
        await runRemoteTabsOp(row.deviceId, {
          kind: "focus_window",
          windowId: row.peerWindowId
        })
        return
      }
    }

    const activeId = await executePickerFocusPlan(plan)
    if (activeId !== null) {
      setActiveTabId(activeId)
    }
  }, [hi, rows, setActiveTabId, visibleRowIndices])

  const executeBulkClose = useCallback(async () => {
    const classified = classifyPickerSelection(rows, selectedTabIds, markedWindowIds)
    try {
      if (classified.kind === "remote") {
        if (markedKind === "window" && classified.peerWindowIds.length > 0) {
          await runRemoteTabsOp(classified.deviceId, {
            kind: "close_windows",
            windowIds: classified.peerWindowIds
          })
        } else if (classified.peerTabIds.length > 0) {
          await runRemoteTabsOp(classified.deviceId, {
            kind: "close_tabs",
            tabIds: classified.peerTabIds
          })
        }
      } else if (classified.kind === "local") {
        await executeCloseAction({
          markedKind,
          markedWindowIds: classified.windowIds,
          selectedTabIds: classified.tabIds
        })
      } else if (classified.kind === "mixed") {
        await onAppendLog?.([tTabs("tabs.picker.remote.mixedDevices", locale)])
      }
    } catch {
      /* ignore */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [
    clearMarkedViaReducer,
    locale,
    markedKind,
    markedWindowIds,
    onAppendLog,
    onRefreshRows,
    rows,
    selectedTabIds
  ])

  const executeFamilySendAtDest = useCallback(
    async (destHi: number, tabIds: number[], closeAfter: boolean): Promise<boolean> => {
      const dest = resolveFamilySendDestination(rows, visibleRowIndices, destHi)
      if (dest === null) {
        return false
      }
      const classified = classifyPickerSelection(rows, tabIds)
      if (classified.kind === "mixed") {
        await onAppendLog?.([tTabs("tabs.picker.remote.mixedDevices", locale)])
        return true
      }
      if (classified.kind === "remote") {
        // EN: Same-device remote reorder stays on tabs_ops (caller continues).
        // JA: 同一リモート内の並べ替えは tabs_ops 本線（呼び出し側が続行）。
        if (classified.deviceId === dest.deviceId) {
          return false
        }
        await onAppendLog?.([tTabs("tabs.picker.remote.familyLocalOnly", locale)])
        return true
      }
      if (classified.kind !== "local") {
        return false
      }
      const result = await sendSelectedTabsToFamilyPeer({
        deviceId: dest.deviceId,
        rows,
        selectedTabIds: classified.tabIds,
        closeAfter,
        peerWindowId: dest.peerWindowId
      })
      await onAppendLog?.(expandSyncLogLines(result.lines, locale))
      return true
    },
    [locale, onAppendLog, rows, visibleRowIndices]
  )

  const executeBulkMove = useCallback(async () => {
    if (selectedTabIds.length === 0) {
      return
    }
    const handled = await executeFamilySendAtDest(moveDestHi, selectedTabIds, moveCloseAfter)
    if (handled) {
      clearMarkedViaReducer()
      await onRefreshRows?.()
      return
    }
    if (visibleRowIndices.length === 0) {
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
    const classified = classifyPickerSelection(rows, toMove)
    try {
      if (classified.kind === "remote") {
        const op = buildRemoteMoveOp(rows, classified.peerTabIds, plan)
        if (op === null) {
          await onAppendLog?.([tTabs("tabs.picker.remote.moveTargetMismatch", locale)])
        } else {
          const result = await runRemoteTabsOp(classified.deviceId, op)
          if (!result.ok) {
            await onAppendLog?.([
              tTabs("tabs.picker.remote.opFailed", locale, {
                detail: result.detail ?? ""
              })
            ])
          }
        }
      } else if (classified.kind === "local") {
        await executeMoveAction({ plan, selectedTabIds: classified.tabIds })
      } else if (classified.kind === "mixed") {
        await onAppendLog?.([tTabs("tabs.picker.remote.mixedDevices", locale)])
      }
    } catch {
      /* ignore */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [
    clearMarkedViaReducer,
    executeFamilySendAtDest,
    locale,
    markedKind,
    markedGroupKeys,
    moveCloseAfter,
    moveDestHi,
    onAppendLog,
    onRefreshRows,
    rows,
    selectedTabIds,
    visibleRowIndices
  ])

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
      const createParams = {
        tabIds,
        title: newGroupTitle,
        color,
        locale,
        onAppendLog
      }
      const ok =
        variant === "groupNew"
          ? await executeCreateNewGroupAction({
              ...createParams,
              resolveCreateGroupPlan: resolvePickerCreateGroupPlan
            })
          : await executeCreateGroupInPlaceAction(createParams)
      if (ok) {
        newGroupTabIdsRef.current = []
        clearMarkedViaReducer()
        await onRefreshRows?.()
      } else {
        await onRefreshRows?.()
      }
      setGroupNewPhase("tabs")
    } catch {
      setGroupNewPhase("tabs")
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
    setGroupNewPhase,
    variant
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
        const familyHandled = await executeFamilySendAtDest(
          snapshot.moveDestHi,
          execTabIds,
          moveCloseAfter
        )
        if (familyHandled) {
          clearMarkedViaReducer()
          setBulkSubMode(null)
          await onRefreshRows?.()
          return
        }
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
        const classified = classifyPickerSelection(
          rows,
          execTabIds,
          intent === "executeClose" ? execMarkedWindowIds : []
        )
        if (classified.kind === "mixed") {
          await onAppendLog?.([tTabs("tabs.picker.remote.mixedDevices", locale)])
          setBulkSubMode(null)
          return
        }
        if (classified.kind === "remote") {
          if (intent === "executeMove" && ctx.movePlan) {
            const op = buildRemoteMoveOp(rows, classified.peerTabIds, ctx.movePlan)
            if (op === null) {
              await onAppendLog?.([tTabs("tabs.picker.remote.moveTargetMismatch", locale)])
              setBulkSubMode(null)
              return
            }
            const result = await runRemoteTabsOp(classified.deviceId, op)
            if (!result.ok) {
              await onAppendLog?.([
                tTabs("tabs.picker.remote.opFailed", locale, { detail: result.detail ?? "" })
              ])
            }
          } else if (intent === "executeClose") {
            if (execMarkedKind === "window" && classified.peerWindowIds.length > 0) {
              await runRemoteTabsOp(classified.deviceId, {
                kind: "close_windows",
                windowIds: classified.peerWindowIds
              })
            } else if (classified.peerTabIds.length > 0) {
              await runRemoteTabsOp(classified.deviceId, {
                kind: "close_tabs",
                tabIds: classified.peerTabIds
              })
            }
          } else if (intent === "executeReload" && classified.peerTabIds.length > 0) {
            await runRemoteTabsOp(classified.deviceId, {
              kind: "reload",
              tabIds: classified.peerTabIds
            })
          } else if (intent === "executeGroup" || intent === "executeNewWindow") {
            await onAppendLog?.([tTabs("tabs.picker.remote.opUnsupported", locale)])
            setBulkSubMode(null)
            return
          }
        } else {
          await EXECUTION_REGISTRY[intent](ctx)
        }
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
      executeFamilySendAtDest,
      groupChoices,
      groupPickIndex,
      moveCloseAfter,
      newGroupTabIdsRef,
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
