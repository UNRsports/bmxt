import type { MutableRefObject } from "react"
import { useCallback } from "react"
import { logBmxtKey } from "../debug/key-log"
import type { TabPickerRow } from "./picker-rows"
import { mapVisibleIndicesToPlanRows } from "./tab-picker-plan-rows"
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
  onExit: () => void
  onRefreshRows?: () => Promise<void>
  setSearchMode: (v: boolean) => void
  setFilterQuery: (v: string) => void
}

export function useTabPickerExecution(p: TabPickerExecutionParams) {
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
    onExit,
    onRefreshRows,
    setSearchMode,
    setFilterQuery
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
    logBmxtKey("picker", "confirmSelection → execute", {
      planKind: plan.kind,
      ...(plan.kind === "activateTab"
        ? { tabId: plan.tabId, windowId: plan.windowId }
        : plan.kind === "focusWindow"
          ? { windowId: plan.windowId }
          : { windowId: plan.windowId, groupId: plan.groupId })
    })
    try {
      if (plan.kind === "activateTab") {
        await chrome.tabs.update(plan.tabId, { active: true })
        await chrome.windows.update(plan.windowId, { focused: true })
        setActiveTabId(plan.tabId)
      } else if (plan.kind === "focusWindow") {
        await chrome.windows.update(plan.windowId, { focused: true })
      } else if (plan.kind === "activateFromGroup") {
        const tabs = await chrome.tabs.query({ windowId: plan.windowId })
        const inGroup = tabs.find((t) =>
          plan.groupId === null
            ? t.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
            : t.groupId === plan.groupId
        )
        if (inGroup?.id !== undefined) {
          await chrome.tabs.update(inGroup.id, { active: true })
          await chrome.windows.update(plan.windowId, { focused: true })
          setActiveTabId(inGroup.id)
        }
      }
    } catch {
      /* ignore */
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
    const plan = resolvePickerMovePlan(markedKind, target)
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
    moveDestHi,
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
      const order = resolvePickerNewWindowOrder(
        tabs
          .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
          .map((t) => ({ id: t.id, windowId: t.windowId ?? 0, index: t.index ?? 0 }))
      )
      await executeNewWindowAction({ selectedTabIds, order })
    } catch {
      /* e.g. incognito mismatch, tab already closed */
    }
    clearMarkedViaReducer()
    await onRefreshRows?.()
  }, [clearMarkedViaReducer, onRefreshRows, selectedTabIds])

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
      await executeCreateNewGroupAction({
        tabIds,
        title: newGroupTitle,
        color,
        onAppendLog,
        onExit,
        resolveCreateGroupPlan: resolvePickerCreateGroupPlan
      })
      newGroupTabIdsRef.current = []
    } catch {
      /* handled in controller */
    } finally {
      groupCreateInFlightRef.current = false
    }
  }, [groupCreateInFlightRef, newGroupColorIndex, newGroupTabIdsRef, newGroupTitle, onAppendLog, onExit])

  const runExecutionIntent = useCallback(
    async (intent: ExecutionIntent) => {
      const v = validatePickerExecute(
        { hi, moveDestHi, markedKind, markedTabIds, markedWindowIds, markedGroupKeys, bulkSubMode },
        selectedTabIds.length
      )
      if (!v.ok) {
        void onAppendLog?.([`error: ${v.reason ?? "実行できません。"}`])
        return
      }
      const ctx: Parameters<(typeof EXECUTION_REGISTRY)[ExecutionIntent]>[0] = {
        markedKind,
        markedWindowIds,
        selectedTabIds
      }
      if (intent === "executeMove") {
        const targetRows = mapVisibleIndicesToPlanRows(rows, visibleRowIndices)
        const target = resolvePickerTarget(moveDestHi, targetRows)
        if (!target) {
          return
        }
        const movePlan = resolvePickerMovePlan(markedKind, target)
        if (!movePlan) {
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
          return
        }
        ctx.groupTarget = groupTarget
        ctx.onOpenCreateNewMeta = () => {
          newGroupTabIdsRef.current = [...selectedTabIds]
          setNewGroupTitle("")
          setNewGroupColorIndex(0)
          setGroupNewPhase("meta")
        }
      } else if (intent === "executeNewWindow") {
        const tabs = await Promise.all(selectedTabIds.map((id) => chrome.tabs.get(id)))
        const newWindowOrder = resolvePickerNewWindowOrder(
          tabs
            .filter((t): t is chrome.tabs.Tab & { id: number } => t.id !== undefined)
            .map((t) => ({ id: t.id, windowId: t.windowId ?? 0, index: t.index ?? 0 }))
        )
        ctx.newWindowOrder = newWindowOrder
      }
      try {
        await EXECUTION_REGISTRY[intent](ctx)
      } catch {
        return
      }
      if (intent === "executeGroup" && ctx.groupTarget?.createNew) {
        return
      }
      clearMarkedViaReducer()
      if (intent === "executeGroup") {
        setGroupNewPhase("tabs")
      }
      await onRefreshRows?.()
    },
    [
      bulkSubMode,
      clearMarkedViaReducer,
      groupChoices,
      groupPickIndex,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      newGroupTabIdsRef,
      onAppendLog,
      onRefreshRows,
      rows,
      selectedTabIds,
      setGroupNewPhase,
      setNewGroupColorIndex,
      setNewGroupTitle
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
    runExecutionIntent
  }
}
