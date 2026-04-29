import { displayTitle, filterTabRowIndices, type TabPickerRow } from "./picker-rows"

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

function toggleMarkedId(prev: number[], tabId: number): number[] {
  const next = new Set(prev)
  if (next.has(tabId)) {
    next.delete(tabId)
  } else {
    next.add(tabId)
  }
  return [...next].sort((a, b) => a - b)
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
  const [markedTabIds, setMarkedTabIds] = useState<number[]>([])
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

  const tabIndices = useMemo(
    () => filterTabRowIndices(rows, filterQuery),
    [rows, filterQuery]
  )

  const markedSet = useMemo(() => new Set(markedTabIds), [markedTabIds])

  const tabIdToWindowId = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of rows) {
      if (r.kind === "tab") {
        m.set(r.tabId, r.windowId)
      }
    }
    return m
  }, [rows])

  useEffect(() => {
    setHi(initialHi)
  }, [initialHi])

  useLayoutEffect(() => {
    if (tabIndices.length === 0) {
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
        const mapped = tabIndices.findIndex((ri) => ri === rowIdx)
        if (mapped >= 0) {
          targetHi = mapped
        }
      }
    }

    targetHi = Math.min(Math.max(0, targetHi), tabIndices.length - 1)

    if (targetHi !== hi) {
      setHi(targetHi)
    }

    const ri = tabIndices[targetHi]
    const row = ri !== undefined ? rows[ri] : undefined
    if (row?.kind === "tab") {
      anchorTabIdRef.current = row.tabId
    }

    setMoveDestHi((d) => Math.min(d, tabIndices.length - 1))
  }, [filterQuery, rows, tabIndices, hi])

  useEffect(() => {
    /* メタ入力中はフィルタで # を外さない（tabIds が空になり tabs.group が失敗するのを防ぐ） */
    if (groupNewPhase === "meta") {
      return
    }
    const visible = new Set<number>()
    for (const ri of tabIndices) {
      const r = rows[ri]
      if (r?.kind === "tab") {
        visible.add(r.tabId)
      }
    }
    setMarkedTabIds((m) => m.filter((id) => visible.has(id)))
  }, [tabIndices, rows, groupNewPhase])

  useEffect(() => {
    if (markedTabIds.length === 0) {
      setBulkSubMode(null)
    }
  }, [markedTabIds.length])

  useEffect(() => {
    if (markedTabIds.length === 0) {
      shiftRangeAnchorHiRef.current = null
    }
  }, [markedTabIds])

  useEffect(() => {
    if (
      bulkSubMode === "move" &&
      prevBulkSubModeRef.current !== "move" &&
      tabIndices.length > 0
    ) {
      setMoveDestHi(Math.min(hi, tabIndices.length - 1))
    }
    prevBulkSubModeRef.current = bulkSubMode
  }, [bulkSubMode, hi, tabIndices.length])

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
      const markedInWin = markedTabIds.filter((id) => tabIdToWindowId.get(id) === winId)

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
    [markedTabIds, rows, tabIdToWindowId]
  )

  useEffect(() => {
    if (tabIndices.length === 0) {
      return
    }
    const rowIndex = tabIndices[hi]!
    void syncChromeTabStripPreview(rowIndex)
  }, [hi, markedTabIds, tabIndices, syncChromeTabStripPreview])

  useLayoutEffect(() => {
    if (groupNewPhase === "meta") {
      inputRef.current?.blur()
      groupMetaTitleRef.current?.focus()
      return
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [groupNewPhase, searchMode])

  useLayoutEffect(() => {
    const rowIndex = tabIndices[hi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [hi, tabIndices])

  useLayoutEffect(() => {
    if (bulkSubMode !== "move") {
      return
    }
    const rowIndex = tabIndices[moveDestHi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bulkSubMode, moveDestHi, tabIndices])

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
    if (tabIndices.length === 0) {
      return
    }
    const rowIndex = tabIndices[hi]!
    const row = rows[rowIndex]
    if (!row || row.kind !== "tab") {
      return
    }
    try {
      await chrome.tabs.update(row.tabId, { active: true })
      await chrome.windows.update(row.windowId, { focused: true })
      setActiveTabId(row.tabId)
    } catch {
      /* ignore */
    }
  }, [hi, rows, tabIndices])

  const closeSearch = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
  }, [])

  const executeBulkClose = useCallback(async () => {
    if (markedTabIds.length === 0) {
      return
    }
    try {
      await chrome.tabs.remove(markedTabIds)
    } catch {
      /* ignore */
    }
    setMarkedTabIds([])
    setBulkSubMode(null)
    await onRefreshRows?.()
  }, [markedTabIds, onRefreshRows])

  const executeBulkMove = useCallback(async () => {
    if (tabIndices.length === 0 || markedTabIds.length === 0) {
      return
    }
    const destRowIndex = tabIndices[moveDestHi]
    const destRow = destRowIndex !== undefined ? rows[destRowIndex] : undefined
    if (!destRow || destRow.kind !== "tab") {
      return
    }
    const toMove = markedTabIds.filter((id) => id !== destRow.tabId)
    if (toMove.length === 0) {
      return
    }
    try {
      const destTab = await chrome.tabs.get(destRow.tabId)
      const winId = destTab.windowId
      const idx = destTab.index ?? 0
      if (winId === undefined) {
        return
      }
      await chrome.tabs.move(toMove, { windowId: winId, index: idx })
    } catch {
      /* ignore */
    }
    setMarkedTabIds([])
    setBulkSubMode(null)
    await onRefreshRows?.()
  }, [markedTabIds, moveDestHi, onRefreshRows, rows, tabIndices])

  const executeBulkGroup = useCallback(async () => {
    if (markedTabIds.length === 0) {
      return
    }
    const choice = groupChoices[groupPickIndex]
    if (!choice) {
      return
    }
    if (choice.id === NEW_GROUP_LIST_SENTINEL) {
      newGroupTabIdsRef.current = [...markedTabIds]
      setNewGroupTitle("")
      setNewGroupColorIndex(0)
      setGroupNewPhase("meta")
      return
    }
    try {
      await chrome.tabs.group({ groupId: choice.id, tabIds: markedTabIds })
    } catch {
      /* e.g. tabs in another window than the group */
    }
    setMarkedTabIds([])
    setBulkSubMode(null)
    setGroupNewPhase("tabs")
    await onRefreshRows?.()
  }, [groupChoices, groupPickIndex, markedTabIds, onRefreshRows])

  const executeBulkNewWindow = useCallback(async () => {
    if (markedTabIds.length === 0) {
      return
    }
    try {
      const tabs = await Promise.all(markedTabIds.map((id) => chrome.tabs.get(id)))
      tabs.sort((a, b) => {
        const wa = a.windowId ?? 0
        const wb = b.windowId ?? 0
        if (wa !== wb) {
          return wa - wb
        }
        return (a.index ?? 0) - (b.index ?? 0)
      })
      const orderedIds = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
      const first = orderedIds[0]
      if (first === undefined) {
        return
      }
      const rest = orderedIds.slice(1)
      const created = await chrome.windows.create({ tabId: first })
      const newWinId = created.id
      if (newWinId === undefined) {
        return
      }
      if (rest.length > 0) {
        await chrome.tabs.move(rest, { windowId: newWinId, index: -1 })
      }
    } catch {
      /* e.g. incognito mismatch, tab already closed */
    }
    setMarkedTabIds([])
    setBulkSubMode(null)
    await onRefreshRows?.()
  }, [markedTabIds, onRefreshRows])

  const executeCreateNewGroup = useCallback(async () => {
    if (groupCreateInFlightRef.current) {
      return
    }
    const tabIds = newGroupTabIdsRef.current
    if (tabIds.length === 0) {
      await onAppendLog?.([
        "error: 選択されたタブがありません（一覧に戻り Tab で選び直してください）。"
      ])
      return
    }
    const color = NEW_GROUP_COLORS[newGroupColorIndex]
    if (color === undefined) {
      return
    }
    const trimmedTitle = newGroupTitle.trim()

    groupCreateInFlightRef.current = true
    try {
      const tabs = await Promise.all(
        tabIds.map((id) => chrome.tabs.get(id).catch(() => undefined))
      )
      const ok = tabs.filter((t): t is chrome.tabs.Tab => t !== undefined)
      if (ok.length !== tabIds.length) {
        await onAppendLog?.(["error: 選択したタブの一部が閉じられています。"])
        return
      }
      const winId = ok[0]?.windowId
      if (
        winId === undefined ||
        ok.some((t) => t.windowId !== winId)
      ) {
        await onAppendLog?.([
          "error: 選択したタブは同じウィンドウ内である必要があります。"
        ])
        return
      }

      /* popup / app / devtools などでは Chromium がタブグループを許可しない */
      let windowType: chrome.windows.WindowType | undefined
      try {
        const win = await chrome.windows.get(winId)
        windowType = win.type
      } catch {
        await onAppendLog?.(["error: ウィンドウ情報を取得できませんでした。"])
        return
      }
      if (windowType !== "normal") {
        await onAppendLog?.([
          "error: このウィンドウ種別ではタブグループを使えません（Chrome は通常ウィンドウ normal のみ）。popup・app・devtools などではグループ化できません。ウェブページを開いた通常ブラウザウィンドウのタブを選んでください。"
        ])
        return
      }

      const groupId = await chrome.tabs.group({ tabIds })
      const updatePayload: chrome.tabGroups.UpdateProperties = { color }
      if (trimmedTitle.length > 0) {
        updatePayload.title = trimmedTitle
      }
      await chrome.tabGroups.update(groupId, updatePayload)

      /* 新規ウィンドウへ分離（①全タブ移動ならグループ維持の tabGroups.move、②一部のみなら ungroup してから move） */
      const groupedTabs = await chrome.tabs.query({ groupId })
      const groupTabCount = groupedTabs.length
      const groupIdSet = new Set(
        groupedTabs.map((t) => t.id).filter((id): id is number => id !== undefined)
      )
      const ordered = [...groupedTabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      /** 現状はグループ内タブをすべて移動。将来サブセット指定時はここだけ差し替え */
      const idsToMove = ordered
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined)
      const movingCount = idsToMove.length

      if (idsToMove.some((id) => !groupIdSet.has(id))) {
        throw new Error("移動対象タブがグループに含まれていません")
      }

      let newWinId: number

      if (movingCount === groupTabCount) {
        const created = await chrome.windows.create({ focused: true })
        const wid = created.id
        if (wid === undefined) {
          throw new Error("新しいウィンドウを開けませんでした")
        }
        const movedGroup = await chrome.tabGroups.move(groupId, {
          windowId: wid,
          index: -1
        })
        const effectiveGid = movedGroup?.id ?? groupId
        const groupedInWin = await chrome.tabs.query({ groupId: effectiveGid })
        const keepIds = new Set(
          groupedInWin.map((t) => t.id).filter((id): id is number => id !== undefined)
        )
        if (keepIds.size > 0) {
          const stray = await chrome.tabs.query({ windowId: wid })
          for (const t of stray) {
            if (t.id !== undefined && !keepIds.has(t.id)) {
              await chrome.tabs.remove(t.id)
            }
          }
        }
        newWinId = wid
      } else if (movingCount < groupTabCount && movingCount > 0) {
        await chrome.tabs.ungroup(idsToMove)
        const firstId = idsToMove[0]
        if (firstId === undefined) {
          throw new Error("タブ ID を確定できませんでした")
        }
        const restIds = idsToMove.slice(1)
        const created = await chrome.windows.create({ tabId: firstId, focused: true })
        const wid = created.id
        if (wid === undefined) {
          throw new Error("新しいウィンドウを開けませんでした")
        }
        if (restIds.length > 0) {
          await chrome.tabs.move(restIds, { windowId: wid, index: -1 })
        }
        newWinId = wid
      } else {
        throw new Error("移動するタブ数が不正です")
      }

      const label = trimmedTitle || "(無題)"
      await onAppendLog?.([
        `created group ${groupId} in new window ${newWinId} · ${color} · "${label}"`
      ])
      newGroupTabIdsRef.current = []
      onExit()
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : typeof err === "string" ? err : String(err)
      await onAppendLog?.([`error: グループ作成に失敗しました — ${detail}`])
    } finally {
      groupCreateInFlightRef.current = false
    }
  }, [newGroupColorIndex, newGroupTitle, onAppendLog, onExit])

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

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) {
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
        if (markedTabIds.length > 0) {
          setMarkedTabIds([])
          setBulkSubMode(null)
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
        if (tabIndices.length === 0) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        const rowIndex = tabIndices[hi]
        const row = rowIndex !== undefined ? rows[rowIndex] : undefined
        if (!row || row.kind !== "tab") {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        e.preventDefault()
        e.stopPropagation()
        shiftRangeAnchorHiRef.current = null
        setMarkedTabIds((m) => toggleMarkedId(m, row.tabId))
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

      if (e.key === " " && markedTabIds.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        setBulkSubMode((m) => {
          if (m === null) {
            return "move"
          }
          if (m === "move") {
            return "close"
          }
          if (m === "close") {
            return "group"
          }
          if (m === "group") {
            return "newWindow"
          }
          return "move"
        })
        return
      }

      if (
        variant === "groupNew" &&
        groupNewPhase === "tabs" &&
        e.key === "Enter" &&
        !e.shiftKey
      ) {
        e.preventDefault()
        if (markedTabIds.length === 0) {
          void confirmSelection()
          return
        }
        newGroupTabIdsRef.current = [...markedTabIds]
        setGroupNewPhase("meta")
        setNewGroupTitle("")
        setNewGroupColorIndex(0)
        return
      }

      if (bulkSubMode === "close" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeBulkClose()
        return
      }

      if (bulkSubMode === "move" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeBulkMove()
        return
      }

      if (bulkSubMode === "group" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeBulkGroup()
        return
      }

      if (bulkSubMode === "newWindow" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void executeBulkNewWindow()
        return
      }

      if (bulkSubMode === "move" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault()
        if (tabIndices.length === 0) {
          return
        }
        if (e.key === "ArrowDown") {
          setMoveDestHi((d) => (d + 1) % tabIndices.length)
        } else {
          setMoveDestHi((d) => (d - 1 + tabIndices.length) % tabIndices.length)
        }
        return
      }

      const shiftArrowBlocksBulk =
        bulkSubMode === "move" ||
        bulkSubMode === "group" ||
        groupNewPhase === "meta"
      if (
        !shiftArrowBlocksBulk &&
        e.shiftKey &&
        (e.key === "ArrowDown" || e.key === "ArrowUp")
      ) {
        e.preventDefault()
        if (tabIndices.length === 0) {
          return
        }
        const n = tabIndices.length
        if (shiftRangeAnchorHiRef.current === null) {
          shiftRangeAnchorHiRef.current = hi
        }
        const anchor = shiftRangeAnchorHiRef.current
        let newHi = hi
        if (e.key === "ArrowDown") {
          newHi = (hi + 1) % n
        } else {
          newHi = (hi - 1 + n) % n
        }
        setHi(newHi)
        const lo = Math.min(anchor, newHi)
        const hiVis = Math.max(anchor, newHi)
        const ids: number[] = []
        for (let v = lo; v <= hiVis; v++) {
          const ri = tabIndices[v]
          const row = ri !== undefined ? rows[ri] : undefined
          if (row?.kind === "tab") {
            ids.push(row.tabId)
          }
        }
        ids.sort((a, b) => a - b)
        setMarkedTabIds(ids)
        return
      }

      if (bulkSubMode === "group" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault()
        if (groupChoices.length === 0) {
          return
        }
        if (e.key === "ArrowDown") {
          setGroupPickIndex((i) => (i + 1) % groupChoices.length)
        } else {
          setGroupPickIndex((i) => (i - 1 + groupChoices.length) % groupChoices.length)
        }
        return
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void confirmSelection()
        return
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

      if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault()
        if (tabIndices.length === 0) {
          return
        }
        shiftRangeAnchorHiRef.current = null
        setHi((h) => (h + 1) % tabIndices.length)
        return
      }
      if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault()
        if (tabIndices.length === 0) {
          return
        }
        shiftRangeAnchorHiRef.current = null
        setHi((h) => (h - 1 + tabIndices.length) % tabIndices.length)
      }
    },
    [
      bulkSubMode,
      closeSearch,
      confirmSelection,
      executeBulkClose,
      executeBulkGroup,
      executeBulkMove,
      executeBulkNewWindow,
      executeCreateNewGroup,
      groupChoices.length,
      hi,
      groupNewPhase,
      markedTabIds,
      onExit,
      rows,
      searchMode,
      tabIndices,
      tabIndices.length,
      variant
    ]
  )

  const headLine = useMemo(() => {
    if (bulkSubMode === "group" && groupNewPhase === "meta") {
      return "Tab picker — [GROUP] 新規 · 名前・色 · Enter 確定 · Esc でターゲット一覧へ · Tab 名前↔色"
    }
    if (variant === "groupNew" && groupNewPhase === "meta") {
      return "group new — 名前・色 · Enter 確定 · Esc タブ一覧へ · Tab 名前↔色"
    }
    if (variant === "groupNew" && groupNewPhase === "tabs") {
      return "group new — ↑↓ ハイライト · Tab で選択 · Enter で名前・色 · / 検索 · Esc"
    }
    const parts = [
      "j/k move",
      "Shift+↑↓ range #",
      "Tab #",
      "Space move/close/group/new win",
      "/ search",
      "Enter page (keep open)",
      "Esc clear # / exit"
    ]
    if (bulkSubMode === "move") {
      return `Tab picker — [MOVE] ↑↓ dest · Enter apply · ${parts.join(" · ")}`
    }
    if (bulkSubMode === "close") {
      return `Tab picker — [CLOSE] Enter remove # tabs · ${parts.join(" · ")}`
    }
    if (bulkSubMode === "group") {
      return `Tab picker — [GROUP] ↑↓ 既存 or 新規 · Enter · ${parts.join(" · ")}`
    }
    if (bulkSubMode === "newWindow") {
      return `Tab picker — [NEW WINDOW] Enter move # tabs to new window · ${parts.join(" · ")}`
    }
    return `Tab picker — ${parts.join(" · ")}`
  }, [bulkSubMode, groupNewPhase, variant])

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
          tabIndices[hi] !== undefined ? `bmxt-tab-row-${tabIndices[hi]}` : undefined
        }>
        {rows.length === 0 ? (
          <div className="bmxt-tab-picker-empty">(タブなし)</div>
        ) : (
          rows.map((row, i) => {
            if (row.kind === "window") {
              return (
                <div key={i} className="bmxt-tab-picker-row bmxt-tab-picker-row--window">
                  {row.label}
                </div>
              )
            }
            if (row.kind === "group") {
              return (
                <div key={i} className="bmxt-tab-picker-row bmxt-tab-picker-row--group">
                  {row.label}
                </div>
              )
            }
            const hidden = tabIndices.indexOf(i) < 0
            if (hidden) {
              return null
            }
            const visIndex = tabIndices.indexOf(i)
            const hiRow = tabIndices[hi] === i
            const markedRow = markedSet.has(row.tabId)
            const moveDestRow =
              bulkSubMode === "move" &&
              visIndex >= 0 &&
              tabIndices[moveDestHi] === i
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
                    {markedSet.has(row.tabId) ? "#" : " "}
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
