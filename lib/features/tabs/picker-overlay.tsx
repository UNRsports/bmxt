import { logBmxtKey } from "../debug/key-log"
import { displayTitle, filterTabRowIndices, type TabPickerRow } from "./picker-rows"
import {
  reducePickerState,
  resolvePickerEnterIntent,
  resolvePickerPreview,
  validatePickerExecute,
  resolvePickerTarget,
  resolvePickerGroupTarget,
  resolvePickerNewWindowOrder,
  resolvePickerConfirmPlan,
  resolvePickerMovePlan,
  resolvePickerCreateGroupPlan,
  resolvePickerHeadline,
  type PickerReducerState
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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

/** Chrome `tabGroups.update` color enum order (API と同じ集合). */
const NEW_GROUP_COLORS: chrome.tabGroups.Color[] = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange"
]

const COLOR_SWATCH_BG: Partial<Record<chrome.tabGroups.Color, string>> = {
  grey: "#9aa0a6",
  blue: "#8ab4f8",
  red: "#f28b82",
  yellow: "#fdd663",
  green: "#81c995",
  pink: "#ff8bcb",
  purple: "#d7aefb",
  cyan: "#78d9ec",
  orange: "#fcad70"
}

/** 既存グループ一覧の「新規グループ」行（Chrome のグループ ID とは別物） */
const NEW_GROUP_LIST_SENTINEL = -1

type BulkSubMode = "move" | "close" | "group" | "newWindow"
type SelectKind = "window" | "group" | "tab"

type GroupChoice = {
  id: number
  windowId: number
  label: string
}

type Props = {
  rows: TabPickerRow[]
  showUrl: boolean
  /** Index into visible tab list (empty filter) — usually opener window's active tab. */
  initialHi: number
  /** `group new` の対話フロー（名前・色）; 省略時は通常の Tab ピッカー. */
  variant?: "default" | "groupNew"
  onAppendLog?: (lines: string[]) => void | Promise<void>
  /** Rebuild picker rows after tab structure changes (move/close/group/new window). */
  onRefreshRows?: () => Promise<void>
  onExit: () => void
}

function groupRowKey(windowId: number, groupId: number | null): string {
  return `${windowId}:${groupId === null ? "none" : String(groupId)}`
}

/** `j`/`k` と矢印の共通方向（Ctrl+Shift や Shift+範囲は物理矢印のみ） */
function verticalNavDirection(e: Pick<KeyboardEvent, "key" | "code">): "up" | "down" | null {
  const k = e.key
  if (k === "ArrowDown" || k === "j" || k === "J") {
    return "down"
  }
  if (k === "ArrowUp" || k === "k" || k === "K") {
    return "up"
  }
  /* Some environments leave `key` empty or Unidentified; `code` is stable for arrows */
  if (e.code === "ArrowDown") {
    return "down"
  }
  if (e.code === "ArrowUp") {
    return "up"
  }
  return null
}

function isPhysicalArrowDown(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowDown" || e.code === "ArrowDown"
}

function isPhysicalArrowUp(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowUp" || e.code === "ArrowUp"
}

export function TabPickerOverlay({
  rows,
  showUrl,
  initialHi,
  variant = "default",
  onAppendLog,
  onRefreshRows,
  onExit
}: Props) {
  const [filterQuery, setFilterQuery] = useState("")
  const [searchMode, setSearchMode] = useState(false)
  const [hi, setHi] = useState(initialHi)
  const [activeTabId, setActiveTabId] = useState<number | null>(() => {
    const firstActive = rows.find((row) => row.kind === "tab" && row.active)
    return firstActive?.kind === "tab" ? firstActive.tabId : null
  })
  const [markedKind, setMarkedKind] = useState<SelectKind | null>(null)
  const [markedTabIds, setMarkedTabIds] = useState<number[]>([])
  const [markedWindowIds, setMarkedWindowIds] = useState<number[]>([])
  const [markedGroupKeys, setMarkedGroupKeys] = useState<string[]>([])
  const [bulkSubMode, setBulkSubMode] = useState<BulkSubMode | null>(null)
  const [moveDestHi, setMoveDestHi] = useState(initialHi)
  const [groupChoices, setGroupChoices] = useState<GroupChoice[]>([])
  const [groupPickIndex, setGroupPickIndex] = useState(0)
  const [groupNewPhase, setGroupNewPhase] = useState<"tabs" | "meta">("tabs")
  const [newGroupTitle, setNewGroupTitle] = useState("")
  const [newGroupColorIndex, setNewGroupColorIndex] = useState(0)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const groupMetaTitleRef = useRef<HTMLInputElement>(null)
  const groupMetaColorStripRef = useRef<HTMLDivElement>(null)
  /** メタ画面へ進んだ時点の Tab ID（フィルタ effect で marked が空になるのを防ぐ） */
  const newGroupTabIdsRef = useRef<number[]>([])
  const groupCreateInFlightRef = useRef(false)
  const rowElRefs = useRef<Map<number, HTMLDivElement | null>>(new Map())
  /** Keeps highlight on the same browser tab when filter text or row data changes (e.g. Esc clears filter). */
  const anchorTabIdRef = useRef<number | null>(null)
  const prevFilterQueryRef = useRef(filterQuery)
  const prevRowsRef = useRef(rows)
  const prevBulkSubModeRef = useRef<BulkSubMode | null>(null)
  /** Fixed visible index anchor for Shift+Arrow range selection (`hi` indices into `tabIndices`). */
  const shiftRangeAnchorHiRef = useRef<number | null>(null)

  const matchedTabSet = useMemo(
    () => new Set(filterTabRowIndices(rows, filterQuery)),
    [rows, filterQuery]
  )
  const visibleRowIndices = useMemo(() => {
    const out: number[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r) {
        continue
      }
      if (!searchMode || filterQuery.trim() === "" || r.kind !== "tab" || matchedTabSet.has(i)) {
        out.push(i)
      }
    }
    return out
  }, [filterQuery, matchedTabSet, rows, searchMode])
  const tabIndices = useMemo(
    () =>
      visibleRowIndices.filter((rowIndex) => {
        const r = rows[rowIndex]
        return r?.kind === "tab"
      }),
    [rows, visibleRowIndices]
  )

  const markedTabSet = useMemo(() => new Set(markedTabIds), [markedTabIds])
  const markedWindowSet = useMemo(() => new Set(markedWindowIds), [markedWindowIds])
  const markedGroupSet = useMemo(() => new Set(markedGroupKeys), [markedGroupKeys])

  const tabIdToWindowId = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of rows) {
      if (r.kind === "tab") {
        m.set(r.tabId, r.windowId)
      }
    }
    return m
  }, [rows])

  const selectedTabIds = useMemo(() => {
    if (markedKind === "tab") {
      return markedTabIds
    }
    if (markedKind === "window") {
      const out: number[] = []
      for (const r of rows) {
        if (r.kind === "tab" && markedWindowSet.has(r.windowId)) {
          out.push(r.tabId)
        }
      }
      return out.sort((a, b) => a - b)
    }
    if (markedKind === "group") {
      const out: number[] = []
      for (const r of rows) {
        if (r.kind !== "tab") {
          continue
        }
        const k = groupRowKey(r.windowId, r.groupId)
        if (markedGroupSet.has(k)) {
          out.push(r.tabId)
        }
      }
      return out.sort((a, b) => a - b)
    }
    return []
  }, [markedGroupSet, markedKind, markedTabIds, markedWindowSet, rows])

  const applyReducedState = useCallback(
    (
      ev:
        | { kind: "moveHi"; delta: number; visibleLen: number }
        | { kind: "moveDest"; delta: number; visibleLen: number }
        | { kind: "cycleSubMode"; direction: number; implicitKind?: SelectKind }
        | { kind: "toggleCurrent"; row: { kind: SelectKind; tabId?: number; windowId?: number; groupKey?: string } }
        | {
            kind: "selectRange"
            input: {
              anchor: number
              target: number
              rows: Array<{ kind: SelectKind; tabId?: number; windowId?: number; groupKey?: string }>
            }
          }
        | { kind: "clearMarked" }
    ) => {
      const next = reducePickerState(
        {
          hi,
          moveDestHi,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys,
          bulkSubMode
        },
        ev
      )
      setHi(next.hi)
      setMoveDestHi(next.moveDestHi)
      setMarkedKind(next.markedKind)
      setMarkedTabIds(next.markedTabIds)
      setMarkedWindowIds(next.markedWindowIds)
      setMarkedGroupKeys(next.markedGroupKeys)
      setBulkSubMode(next.bulkSubMode)
    },
    [bulkSubMode, hi, markedGroupKeys, markedKind, markedTabIds, markedWindowIds, moveDestHi]
  )

  /** 同一キー処理内で 2 回以上 reduce するとき、閉包の古い `hi` で 2 回目が走るのを防ぐ */
  const applyReducedStateSequence = useCallback(
    (
      events: Array<
        | { kind: "moveHi"; delta: number; visibleLen: number }
        | { kind: "moveDest"; delta: number; visibleLen: number }
        | { kind: "cycleSubMode"; direction: number; implicitKind?: SelectKind }
        | { kind: "toggleCurrent"; row: { kind: SelectKind; tabId?: number; windowId?: number; groupKey?: string } }
        | {
            kind: "selectRange"
            input: {
              anchor: number
              target: number
              rows: Array<{ kind: SelectKind; tabId?: number; windowId?: number; groupKey?: string }>
            }
          }
        | { kind: "clearMarked" }
      >
    ) => {
      let s: PickerReducerState = {
        hi,
        moveDestHi,
        markedKind,
        markedTabIds,
        markedWindowIds,
        markedGroupKeys,
        bulkSubMode
      }
      for (const ev of events) {
        s = reducePickerState(s, ev)
      }
      setHi(s.hi)
      setMoveDestHi(s.moveDestHi)
      setMarkedKind(s.markedKind)
      setMarkedTabIds(s.markedTabIds)
      setMarkedWindowIds(s.markedWindowIds)
      setMarkedGroupKeys(s.markedGroupKeys)
      setBulkSubMode(s.bulkSubMode)
    },
    [bulkSubMode, hi, markedGroupKeys, markedKind, markedTabIds, markedWindowIds, moveDestHi]
  )

  const clearMarkedViaReducer = useCallback(() => {
    applyReducedState({ kind: "clearMarked" })
  }, [applyReducedState])

  useEffect(() => {
    setHi(initialHi)
  }, [initialHi])

  useLayoutEffect(() => {
    if (visibleRowIndices.length === 0) {
      return
    }

    const structChanged =
      prevFilterQueryRef.current !== filterQuery || prevRowsRef.current !== rows
    prevFilterQueryRef.current = filterQuery
    prevRowsRef.current = rows

    let targetHi = hi

    if (structChanged && anchorTabIdRef.current !== null) {
      const tid = anchorTabIdRef.current
      const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tid)
      if (rowIdx >= 0) {
        const mapped = visibleRowIndices.findIndex((ri) => ri === rowIdx)
        if (mapped >= 0) {
          targetHi = mapped
        }
      }
    }

    targetHi = Math.min(Math.max(0, targetHi), visibleRowIndices.length - 1)

    if (targetHi !== hi) {
      setHi(targetHi)
    }

    const ri = visibleRowIndices[targetHi]
    const row = ri !== undefined ? rows[ri] : undefined
    if (row?.kind === "tab") {
      anchorTabIdRef.current = row.tabId
    }

    setMoveDestHi((d) => Math.min(d, visibleRowIndices.length - 1))
  }, [filterQuery, rows, visibleRowIndices, hi])

  useEffect(() => {
    /* メタ入力中はフィルタで # を外さない（tabIds が空になり tabs.group が失敗するのを防ぐ） */
    if (groupNewPhase === "meta") {
      return
    }
    const visibleTabs = new Set<number>()
    const visibleWindows = new Set<number>()
    const visibleGroups = new Set<string>()
    for (const ri of visibleRowIndices) {
      const r = rows[ri]
      if (!r) {
        continue
      }
      if (r.kind === "tab") {
        visibleTabs.add(r.tabId)
      } else if (r.kind === "window") {
        visibleWindows.add(r.windowId)
      } else if (r.kind === "group") {
        visibleGroups.add(groupRowKey(r.windowId, r.groupId))
      }
    }
    setMarkedTabIds((m) => m.filter((id) => visibleTabs.has(id)))
    setMarkedWindowIds((m) => m.filter((id) => visibleWindows.has(id)))
    setMarkedGroupKeys((m) => m.filter((k) => visibleGroups.has(k)))
  }, [visibleRowIndices, rows, groupNewPhase])

  const markedCount =
    markedKind === "tab"
      ? markedTabIds.length
      : markedKind === "window"
        ? markedWindowIds.length
        : markedKind === "group"
          ? markedGroupKeys.length
          : 0

  useEffect(() => {
    if (markedCount === 0) {
      setBulkSubMode(null)
      setMarkedKind(null)
      shiftRangeAnchorHiRef.current = null
    }
  }, [markedCount])

  useEffect(() => {
    if (
      bulkSubMode === "move" &&
      prevBulkSubModeRef.current !== "move" &&
      visibleRowIndices.length > 0
    ) {
      setMoveDestHi(Math.min(hi, visibleRowIndices.length - 1))
    }
    prevBulkSubModeRef.current = bulkSubMode
  }, [bulkSubMode, hi, visibleRowIndices.length])

  useEffect(() => {
    if (bulkSubMode !== "group") {
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const gs = await chrome.tabGroups.query({})
        if (cancelled) {
          return
        }
        const none = chrome.tabGroups.TAB_GROUP_ID_NONE
        const choices: GroupChoice[] = gs
          .filter((g) => g.id !== undefined && g.id !== none)
          .map((g) => ({
            id: g.id!,
            windowId: g.windowId ?? 0,
            label: `${(g.title || "").trim() || "(無題のグループ)"} · win ${g.windowId ?? "?"}`
          }))
          .sort((a, b) => a.windowId - b.windowId || a.id - b.id)
        choices.unshift({
          id: NEW_GROUP_LIST_SENTINEL,
          windowId: 0,
          label: "＋ 新規グループ（名前・色を指定）"
        })
        setGroupChoices(choices)
        setGroupPickIndex(0)
      } catch {
        if (!cancelled) {
          setGroupChoices([
            {
              id: NEW_GROUP_LIST_SENTINEL,
              windowId: 0,
              label: "＋ 新規グループ（名前・色を指定）"
            }
          ])
          setGroupPickIndex(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bulkSubMode])

  /**
   * Mirror picker state to Chrome's tab strip: multi-select via `tabs.highlight`
   * when the current row's window has marked tabs; otherwise single `tabs.update`.
   */
  const syncChromeTabStripPreview = useCallback(
    async (rowIndex: number) => {
      const row = rows[rowIndex]
      if (!row || row.kind !== "tab") {
        return
      }
      const winId = row.windowId
      const markedInWin =
        markedKind === "tab"
          ? markedTabIds.filter((id) => tabIdToWindowId.get(id) === winId)
          : []

      try {
        const tabsInWin = await chrome.tabs.query({ windowId: winId })
        if (markedInWin.length === 0) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const hiInMarked = markedInWin.includes(row.tabId)
        if (!hiInMarked) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const indices = markedInWin
          .map((id) => tabsInWin.find((t) => t.id === id)?.index)
          .filter((x): x is number => x !== undefined)
          .sort((a, b) => a - b)

        if (indices.length === 0) {
          await chrome.tabs.update(row.tabId, { active: true })
          setActiveTabId(row.tabId)
          return
        }

        const hiIdx = tabsInWin.find((t) => t.id === row.tabId)?.index
        const tabsArg =
          hiIdx !== undefined && indices.includes(hiIdx)
            ? [hiIdx, ...indices.filter((i) => i !== hiIdx)]
            : indices

        await chrome.tabs.highlight({ windowId: winId, tabs: tabsArg })
        setActiveTabId(row.tabId)
      } catch {
        /* tab/window may have closed */
      }
    },
    [markedKind, markedTabIds, rows, tabIdToWindowId]
  )

  useEffect(() => {
    if (visibleRowIndices.length === 0) {
      return
    }
    const rowIndex = visibleRowIndices[hi]!
    void syncChromeTabStripPreview(rowIndex)
  }, [hi, markedTabIds, visibleRowIndices, syncChromeTabStripPreview])

  useLayoutEffect(() => {
    if (groupNewPhase === "meta") {
      inputRef.current?.blur()
      groupMetaTitleRef.current?.focus()
      return
    }
    inputRef.current?.focus()
  }, [groupNewPhase, searchMode])

  useLayoutEffect(() => {
    const rowIndex = visibleRowIndices[hi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [hi, visibleRowIndices])

  useLayoutEffect(() => {
    if (bulkSubMode !== "move") {
      return
    }
    const rowIndex = visibleRowIndices[moveDestHi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bulkSubMode, moveDestHi, visibleRowIndices])

  const groupPanelRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (bulkSubMode !== "group" || groupChoices.length === 0) {
      return
    }
    const row = groupPanelRef.current?.querySelector<HTMLElement>(
      `[data-bmxt-group-pick="${groupPickIndex}"]`
    )
    row?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bulkSubMode, groupChoices.length, groupPickIndex])

  const confirmSelection = useCallback(async () => {
    if (visibleRowIndices.length === 0) {
      return
    }
    const confirmRows = visibleRowIndices
      .map((ri) => rows[ri])
      .filter((r): r is TabPickerRow => r !== undefined)
      .map((r) => {
        if (r.kind === "tab") {
          return { kind: "tab" as const, tabId: r.tabId, windowId: r.windowId, groupId: r.groupId }
        }
        if (r.kind === "window") {
          return { kind: "window" as const, windowId: r.windowId }
        }
        return { kind: "group" as const, windowId: r.windowId, groupId: r.groupId }
      })
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
  }, [hi, rows, visibleRowIndices])

  const closeSearch = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
  }, [])

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
    const targetRows = visibleRowIndices
      .map((ri) => rows[ri])
      .filter((r): r is TabPickerRow => r !== undefined)
      .map((r) => {
        if (r.kind === "tab") {
          return { kind: "tab" as const, tabId: r.tabId, windowId: r.windowId, groupId: r.groupId }
        }
        if (r.kind === "window") {
          return { kind: "window" as const, windowId: r.windowId }
        }
        return { kind: "group" as const, windowId: r.windowId, groupId: r.groupId }
      })
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
    resolvePickerMovePlan,
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
  }, [clearMarkedViaReducer, groupChoices, groupPickIndex, onRefreshRows, selectedTabIds])

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
  }, [newGroupColorIndex, newGroupTitle, onAppendLog, onExit, resolvePickerCreateGroupPlan])

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
        const targetRows = visibleRowIndices
          .map((ri) => rows[ri])
          .filter((r): r is TabPickerRow => r !== undefined)
          .map((r) => {
            if (r.kind === "tab") {
              return { kind: "tab" as const, tabId: r.tabId, windowId: r.windowId, groupId: r.groupId }
            }
            if (r.kind === "window") {
              return { kind: "window" as const, windowId: r.windowId }
            }
            return { kind: "group" as const, windowId: r.windowId, groupId: r.groupId }
          })
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
      onAppendLog,
      onRefreshRows,
      resolvePickerGroupTarget,
      resolvePickerMovePlan,
      resolvePickerNewWindowOrder,
      resolvePickerTarget,
      rows,
      selectedTabIds
    ]
  )

  /**
   * ←/→ で [MOVE]/[CLOSE]/… をサイクル。
   * ハイライトが未マークのタブ行なら、先に Tab と同等で `#` を付けてからサイクルする。
   * ウィンドウ／グループ行などでは従来どおり `implicitKind` のみ。
   */
  const runPickerCycleBulkModeKeys = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return false
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }

      if (groupNewPhase === "meta") {
        const ae = document.activeElement
        if (
          ae === groupMetaTitleRef.current ||
          groupMetaColorStripRef.current?.contains(ae ?? null)
        ) {
          return false
        }
      }

      const rowIndex = visibleRowIndices[hi]
      const row = rowIndex !== undefined ? rows[rowIndex] : undefined
      if (!row) {
        return false
      }

      const step = e.key === "ArrowRight" ? 1 : -1
      const shouldAutoMarkTab =
        row.kind === "tab" && !markedTabSet.has(row.tabId)

      e.preventDefault()
      e.stopPropagation()

      if (shouldAutoMarkTab) {
        applyReducedStateSequence([
          {
            kind: "toggleCurrent",
            row: { kind: "tab", tabId: row.tabId }
          },
          {
            kind: "cycleSubMode",
            direction: step
          }
        ])
        return true
      }

      let implicitKind: SelectKind | undefined
      if (markedCount === 0 || markedKind === null) {
        implicitKind =
          row.kind === "tab" ? "tab" : row.kind === "window" ? "window" : "group"
      }

      applyReducedState({
        kind: "cycleSubMode",
        direction: step,
        ...(implicitKind !== undefined ? { implicitKind } : {})
      })
      return true
    },
    [
      applyReducedState,
      applyReducedStateSequence,
      groupNewPhase,
      hi,
      markedCount,
      markedKind,
      markedTabSet,
      rows,
      visibleRowIndices
    ]
  )

  /**
   * Enter でタブ確定・一括実行。プロンプト textarea にフォーカスが残っていても window キャプチャで拾う。
   */
  const runPickerEnterKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }

      if (groupNewPhase === "meta") {
        return false
      }

      const intent = resolvePickerEnterIntent(
        {
          hi,
          moveDestHi,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys,
          bulkSubMode
        },
        variant,
        groupNewPhase,
        selectedTabIds.length,
        false
      )
      if (intent === "none") {
        logBmxtKey("picker", "Enter → intent none (Shift+Enter 等)", {})
        return false
      }

      logBmxtKey("picker", "Enter", { intent })

      e.preventDefault()
      e.stopPropagation()

      if (intent === "openGroupMeta") {
        newGroupTabIdsRef.current = [...selectedTabIds]
        setGroupNewPhase("meta")
        setNewGroupTitle("")
        setNewGroupColorIndex(0)
        return true
      }
      if (
        intent === "executeClose" ||
        intent === "executeMove" ||
        intent === "executeGroup" ||
        intent === "executeNewWindow"
      ) {
        void runExecutionIntent(intent)
        return true
      }
      if (intent === "confirmSelection") {
        void confirmSelection()
        return true
      }
      return false
    },
    [
      bulkSubMode,
      confirmSelection,
      groupNewPhase,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      runExecutionIntent,
      selectedTabIds,
      variant
    ]
  )

  const onMetaTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setGroupNewPhase("tabs")
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        requestAnimationFrame(() => groupMetaColorStripRef.current?.focus())
      }
    },
    [executeCreateNewGroup]
  )

  const onMetaColorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setGroupNewPhase("tabs")
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        setNewGroupColorIndex(
          (i) => (i - 1 + NEW_GROUP_COLORS.length) % NEW_GROUP_COLORS.length
        )
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        setNewGroupColorIndex((i) => (i + 1) % NEW_GROUP_COLORS.length)
        return
      }
      if (e.key === "Tab") {
        e.preventDefault()
        requestAnimationFrame(() => groupMetaTitleRef.current?.focus())
      }
    },
    [executeCreateNewGroup]
  )

  /**
   * ↑/↓/j/k による縦移動。`window` キャプチャ用と、IME 等でキャプチャが握れないときの textarea 用に同一実装を使う。
   * 処理した場合は true（このとき preventDefault / stopPropagation 済み）。
   */
  const runPickerVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      const navDir = verticalNavDirection(e)
      if (navDir === null) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return false
      }

      if (groupNewPhase === "meta") {
        const ae = document.activeElement
        if (
          ae === groupMetaTitleRef.current ||
          groupMetaColorStripRef.current?.contains(ae ?? null)
        ) {
          return false
        }
      }

      if (bulkSubMode === "move") {
        e.preventDefault()
        e.stopPropagation()
        if (visibleRowIndices.length === 0) {
          return true
        }
        if (navDir === "down") {
          applyReducedState({ kind: "moveDest", delta: 1, visibleLen: visibleRowIndices.length })
        } else {
          applyReducedState({ kind: "moveDest", delta: -1, visibleLen: visibleRowIndices.length })
        }
        return true
      }

      if (
        e.ctrlKey &&
        e.shiftKey &&
        visibleRowIndices.length > 0 &&
        (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
      ) {
        e.preventDefault()
        e.stopPropagation()
        const delta = isPhysicalArrowDown(e) ? 1 : -1
        const previewRows = visibleRowIndices.map((ri) => {
          const r = rows[ri]
          if (!r) {
            return { kind: "tab" as const }
          }
          if (r.kind === "tab") {
            return { kind: "tab" as const, tabId: r.tabId }
          }
          return { kind: r.kind as "window" | "group" }
        })
        const decision = resolvePickerPreview(hi, delta, previewRows)
        applyReducedState({
          kind: "moveHi",
          delta,
          visibleLen: visibleRowIndices.length
        })
        if (decision.activateTabId !== null) {
          void chrome.tabs.update(decision.activateTabId, { active: true }).catch(() => undefined)
        }
        return true
      }

      const shiftArrowBlocksBulk = bulkSubMode === "group" || groupNewPhase === "meta"
      if (
        !shiftArrowBlocksBulk &&
        e.shiftKey &&
        (isPhysicalArrowDown(e) || isPhysicalArrowUp(e))
      ) {
        e.preventDefault()
        e.stopPropagation()
        if (visibleRowIndices.length === 0) {
          return true
        }
        const n = visibleRowIndices.length
        if (shiftRangeAnchorHiRef.current === null) {
          shiftRangeAnchorHiRef.current = hi
        }
        const anchor = shiftRangeAnchorHiRef.current
        let newHi = hi
        if (isPhysicalArrowDown(e)) {
          newHi = (hi + 1) % n
        } else {
          newHi = (hi - 1 + n) % n
        }
        const lo = Math.min(anchor, newHi)
        const hiVis = Math.max(anchor, newHi)
        const rangeRows = visibleRowIndices.slice(lo, hiVis + 1).map((ri) => {
          const row = rows[ri]
          if (!row) {
            return { kind: "tab" as const }
          }
          if (row.kind === "tab") {
            return { kind: "tab" as const, tabId: row.tabId }
          }
          if (row.kind === "window") {
            return { kind: "window" as const, windowId: row.windowId }
          }
          return {
            kind: "group" as const,
            groupKey: groupRowKey(row.windowId, row.groupId)
          }
        })
        applyReducedStateSequence([
          {
            kind: "moveHi",
            delta: isPhysicalArrowDown(e) ? 1 : -1,
            visibleLen: n
          },
          {
            kind: "selectRange",
            input: {
              anchor: 0,
              target: rangeRows.length > 0 ? rangeRows.length - 1 : 0,
              rows: rangeRows
            }
          }
        ])
        return true
      }

      if (bulkSubMode === "group") {
        e.preventDefault()
        e.stopPropagation()
        if (groupChoices.length === 0) {
          return true
        }
        if (navDir === "down") {
          setGroupPickIndex((i) => (i + 1) % groupChoices.length)
        } else {
          setGroupPickIndex((i) => (i - 1 + groupChoices.length) % groupChoices.length)
        }
        return true
      }

      e.preventDefault()
      e.stopPropagation()
      if (visibleRowIndices.length === 0) {
        return true
      }
      shiftRangeAnchorHiRef.current = null
      applyReducedState({
        kind: "moveHi",
        delta: navDir === "down" ? 1 : -1,
        visibleLen: visibleRowIndices.length
      })
      return true
    },
    [
      applyReducedState,
      applyReducedStateSequence,
      bulkSubMode,
      groupChoices.length,
      groupNewPhase,
      hi,
      rows,
      visibleRowIndices
    ]
  )

  /** Window capture: プロンプト textarea 等にフォーカスが残っていても ↑↓/Enter/←→ を拾う */
  useEffect(() => {
    const wrap = (ev: KeyboardEvent) => {
      if (runPickerVerticalNav(ev)) {
        logBmxtKey("picker", "handled", {
          handler: "verticalNav",
          key: ev.key,
          code: ev.code
        })
        return
      }
      if (runPickerCycleBulkModeKeys(ev)) {
        logBmxtKey("picker", "handled", {
          handler: "cycleBulkMode",
          key: ev.key,
          code: ev.code
        })
        return
      }
      if (runPickerEnterKey(ev)) {
        return
      }
    }
    window.addEventListener("keydown", wrap, true)
    return () => window.removeEventListener("keydown", wrap, true)
  }, [runPickerCycleBulkModeKeys, runPickerEnterKey, runPickerVerticalNav])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
        return
      }

      /** IME やキャプチャが握れない経路でも ↑↓/j/k が効くようにする（window 側と同一ロジック） */
      if (runPickerVerticalNav(e.nativeEvent)) {
        return
      }
      if (runPickerCycleBulkModeKeys(e.nativeEvent)) {
        return
      }

      /** メタ画面で IME 用 textarea がフォーカスを残していると Enter が confirm に流れるのを防ぐ */
      if (groupNewPhase === "meta" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeCreateNewGroup()
        return
      }

      if (e.key === "Escape") {
        e.preventDefault()
        if (groupNewPhase === "meta") {
          setGroupNewPhase("tabs")
          requestAnimationFrame(() => inputRef.current?.focus())
          return
        }
        if (markedCount > 0) {
          applyReducedState({ kind: "clearMarked" })
          shiftRangeAnchorHiRef.current = null
          return
        }
        if (searchMode) {
          closeSearch()
          return
        }
        if (bulkSubMode !== null) {
          setBulkSubMode(null)
          return
        }
        onExit()
        return
      }

      if (e.key === "Tab") {
        if (groupNewPhase === "meta") {
          e.preventDefault()
          return
        }
        if (visibleRowIndices.length === 0) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const rowIndex = visibleRowIndices[hi]
        const row = rowIndex !== undefined ? rows[rowIndex] : undefined
        if (!row) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        e.preventDefault()
        e.stopPropagation()
        shiftRangeAnchorHiRef.current = null
        applyReducedState({
          kind: "toggleCurrent",
          row:
            row.kind === "tab"
              ? { kind: "tab", tabId: row.tabId }
              : row.kind === "window"
                ? { kind: "window", windowId: row.windowId }
                : { kind: "group", groupKey: groupRowKey(row.windowId, row.groupId) }
        })
        return
      }

      if (e.key === " " && variant === "groupNew" && markedTabIds.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (e.key === " " && groupNewPhase === "meta") {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (e.key === "Enter") {
        if (runPickerEnterKey(e.nativeEvent)) {
          return
        }
      }

      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        if (!searchMode) {
          setSearchMode(true)
        }
        return
      }

      if (!searchMode) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
        }
      }
    },
    [
      applyReducedState,
      bulkSubMode,
      closeSearch,
      executeBulkClose,
      executeBulkGroup,
      executeBulkMove,
      executeBulkNewWindow,
      executeCreateNewGroup,
      groupChoices.length,
      hi,
      groupNewPhase,
      markedCount,
      markedKind,
      markedGroupKeys,
      markedTabIds,
      onExit,
      runPickerCycleBulkModeKeys,
      runPickerEnterKey,
      runPickerVerticalNav,
      rows,
      searchMode,
      variant,
      visibleRowIndices
    ]
  )

  const headLine = useMemo(
    () =>
      resolvePickerHeadline({
        bulkSubMode,
        groupNewPhase,
        variant
      }),
    [bulkSubMode, groupNewPhase, variant]
  )

  const setRowRef = useCallback((rowIndex: number, el: HTMLDivElement | null) => {
    if (el) {
      rowElRefs.current.set(rowIndex, el)
    } else {
      rowElRefs.current.delete(rowIndex)
    }
  }, [])

  return (
    <div
      className="bmxt-tab-picker"
      onMouseDown={(ev) => {
        const t = ev.target as HTMLElement
        if (t.closest(".bmxt-tab-picker-new-group-meta")) {
          return
        }
        if (groupNewPhase === "meta") {
          return
        }
        requestAnimationFrame(() => inputRef.current?.focus())
      }}>
      <div className="bmxt-tab-picker-head">{headLine}</div>
      <textarea
        ref={inputRef}
        className="bmxt-tab-picker-filter-ime"
        rows={1}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={searchMode ? "Filter tabs" : "Tab picker key input"}
        value={searchMode ? filterQuery : ""}
        onChange={(e) => {
          if (searchMode) {
            setFilterQuery(e.target.value)
          }
        }}
        onKeyDown={onInputKeyDown}
        onCompositionEnd={(e) => {
          if (searchMode) {
            setFilterQuery(e.currentTarget.value)
          }
        }}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Tabs"
        aria-multiselectable={true}
        aria-activedescendant={
          visibleRowIndices[hi] !== undefined ? `bmxt-tab-row-${visibleRowIndices[hi]}` : undefined
        }>
        {rows.length === 0 ? (
          <div className="bmxt-tab-picker-empty">(タブなし)</div>
        ) : (
          rows.map((row, i) => {
            const hidden = visibleRowIndices.indexOf(i) < 0
            if (hidden) {
              return null
            }
            const visIndex = visibleRowIndices.indexOf(i)
            const hiRow = visibleRowIndices[hi] === i
            const moveDestRow =
              bulkSubMode === "move" &&
              visIndex >= 0 &&
              visibleRowIndices[moveDestHi] === i
            if (row.kind === "window") {
              const markedRow = markedWindowSet.has(row.windowId)
              return (
                <div
                  key={i}
                  id={`bmxt-tab-row-${i}`}
                  ref={(el) => setRowRef(i, el)}
                  className={`bmxt-tab-picker-row bmxt-tab-picker-row--window${
                    hiRow ? " bmxt-tab-picker-row--hi" : ""
                  }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
                    moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
                  }`}>
                  <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
                  {row.label}
                </div>
              )
            }
            if (row.kind === "group") {
              const markedRow = markedGroupSet.has(groupRowKey(row.windowId, row.groupId))
              return (
                <div
                  key={i}
                  id={`bmxt-tab-row-${i}`}
                  ref={(el) => setRowRef(i, el)}
                  className={`bmxt-tab-picker-row bmxt-tab-picker-row--group${
                    hiRow ? " bmxt-tab-picker-row--hi" : ""
                  }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
                    moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
                  }`}>
                  <span className="bmxt-tab-picker-tab-glyph">{markedRow ? "#" : " "}</span>
                  {row.label}
                </div>
              )
            }
            const markedRow = markedTabSet.has(row.tabId)
            const rowClass = `bmxt-tab-picker-row bmxt-tab-picker-row--tab${
              hiRow ? " bmxt-tab-picker-row--hi" : ""
            }${markedRow ? " bmxt-tab-picker-row--marked" : ""}${
              moveDestRow ? " bmxt-tab-picker-row--move-dest" : ""
            }`
            return (
              <div
                key={i}
                id={`bmxt-tab-row-${i}`}
                ref={(el) => setRowRef(i, el)}
                className={rowClass}
                role="option"
                aria-selected={hiRow || markedRow}>
                <div className="bmxt-tab-picker-tab-title">
                  <span className="bmxt-tab-picker-tab-glyph">
                    {(activeTabId !== null ? activeTabId === row.tabId : row.active) ? "*" : " "}
                  </span>
                  <span className="bmxt-tab-picker-tab-glyph">
                    {markedTabSet.has(row.tabId) ? "#" : " "}
                  </span>
                  {displayTitle(row.title)}
                </div>
                {showUrl ? (
                  <div className="bmxt-tab-picker-tab-url">{row.url || "(no url)"}</div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
      {bulkSubMode === "group" && variant === "default" && groupNewPhase !== "meta" ? (
        <div ref={groupPanelRef} className="bmxt-tab-picker-group-panel bmxt-scroll">
          <div className="bmxt-tab-picker-group-head">Target groups</div>
          {groupChoices.length === 0 ? (
            <div className="bmxt-tab-picker-group-empty">(読み込み中…)</div>
          ) : (
            groupChoices.map((g, idx) => (
              <div
                key={`${g.id}-${idx}`}
                data-bmxt-group-pick={idx}
                className={`bmxt-tab-picker-group-row${
                  idx === groupPickIndex ? " bmxt-tab-picker-group-row--hi" : ""
                }`}>
                {g.label}
              </div>
            ))
          )}
        </div>
      ) : null}
      {groupNewPhase === "meta" ? (
        <div className="bmxt-tab-picker-new-group-meta">
          <div className="bmxt-tab-picker-group-head">新しいグループ</div>
          <div className="bmxt-tab-picker-new-group-field">
            <label className="bmxt-tab-picker-new-group-label" htmlFor="bmxt-new-group-title">
              名前
            </label>
            <input
              id="bmxt-new-group-title"
              ref={groupMetaTitleRef}
              className="bmxt-tab-picker-new-group-input"
              type="text"
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              onKeyDown={onMetaTitleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
            />
          </div>
          <div className="bmxt-tab-picker-new-group-field">
            <div className="bmxt-tab-picker-new-group-label">色（← →）</div>
            <div
              ref={groupMetaColorStripRef}
              className="bmxt-tab-picker-color-strip"
              tabIndex={0}
              role="listbox"
              aria-label="グループの色"
              aria-activedescendant={`bmxt-color-${NEW_GROUP_COLORS[newGroupColorIndex]}`}
              onKeyDown={onMetaColorKeyDown}>
              {NEW_GROUP_COLORS.map((c, i) => (
                <span
                  key={c}
                  id={`bmxt-color-${c}`}
                  className={`bmxt-tab-picker-color-swatch${
                    i === newGroupColorIndex ? " bmxt-tab-picker-color-swatch--hi" : ""
                  }`}
                  style={{ background: COLOR_SWATCH_BG[c] ?? "#484f58" }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {searchMode ? (
        <div className="bmxt-tab-picker-filter">
          <span className="bmxt-tab-picker-filter-label">/</span>
          <span className="bmxt-tab-picker-filter-query">{filterQuery || " "}</span>
          <span className="bmxt-tab-picker-filter-hint">Esc 検索終了</span>
        </div>
      ) : null}
    </div>
  )
}
