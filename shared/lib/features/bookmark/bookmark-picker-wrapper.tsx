import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import type { MutableRefObject, SetStateAction } from "react"
import { tBookmark } from "../setting/i18n/ns/bookmark"
import { useUiSettings } from "../setting/use-ui-settings"
import { TreePickerBody } from "../side-picker/tree/tree-picker-body"
import type { TreePickerActionMenu } from "../side-picker/tree/tree-picker-types"
import {
  getSyncLinkStatus,
  subscribeSyncLinkStatus
} from "../sync/link/sync-link-status.ts"
import {
  bookmarkActionTargetRows,
  clearBookmarkPickerMarks,
  toggleBookmarkRowMark,
  type BookmarkPickerState
} from "./bookmark-picker-state"
import {
  bookmarkActionsForTargets,
  bookmarkTargetLabel,
  buildBookmarkActionLine,
  buildBookmarkTreeViews,
  removeBookmarkRowsById,
  type BookmarkActionId
} from "./bookmark-picker-view"
import {
  collapseBookmarkFolder,
  computeBookmarkVisibleRowIndices,
  expandBookmarkFolder
} from "./fold-state"

export type BookmarkPickerWrapperProps = {
  state: BookmarkPickerState
  onStateChange: (update: (prev: BookmarkPickerState) => BookmarkPickerState) => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  /** EN: Typed-line submission; no direct chrome.bookmarks calls. */
  submitConstructedLine: (line: string) => void
  onAppendLog: (lines: string[]) => void | Promise<void>
}

type MenuMode = "actions" | "sendPeers"

function actionLabelKey(
  action: BookmarkActionId
):
  | "bookmark.picker.action.open"
  | "bookmark.picker.action.remove"
  | "bookmark.picker.action.move"
  | "bookmark.picker.action.send" {
  if (action === "open") {
    return "bookmark.picker.action.open"
  }
  if (action === "remove") {
    return "bookmark.picker.action.remove"
  }
  if (action === "move") {
    return "bookmark.picker.action.move"
  }
  return "bookmark.picker.action.send"
}

export function BookmarkPickerWrapper({
  state,
  onStateChange,
  onReturnToPrompt,
  onExitToDetailBar,
  keyboardActive = false,
  pickerInputRef,
  submitConstructedLine,
  onAppendLog
}: BookmarkPickerWrapperProps) {
  const { settings } = useUiSettings()
  const locale = settings.locale
  const [foldRevision, setFoldRevision] = useState(0)
  const [menuMode, setMenuMode] = useState<MenuMode>("actions")
  const syncStatus = useSyncExternalStore(
    subscribeSyncLinkStatus,
    getSyncLinkStatus,
    getSyncLinkStatus
  )

  const visibleIndices = useMemo(
    () => computeBookmarkVisibleRowIndices(state.rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foldRevision signals external fold-state change
    [state.rows, foldRevision]
  )
  const views = useMemo(
    () => buildBookmarkTreeViews(state, visibleIndices),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foldRevision signals external fold-state change
    [state, visibleIndices, foldRevision]
  )
  const hi = views.length === 0 ? 0 : Math.min(Math.max(0, state.hi), views.length - 1)

  const highlightedRow = useMemo(() => {
    const rowIndex = visibleIndices[hi]
    if (rowIndex === undefined) {
      return null
    }
    return state.rows[rowIndex] ?? null
  }, [hi, state.rows, visibleIndices])

  const targets = useMemo(
    () => bookmarkActionTargetRows(state, highlightedRow),
    [highlightedRow, state]
  )
  const actions = useMemo(() => bookmarkActionsForTargets(targets), [targets])

  const onHiChange = useCallback(
    (action: SetStateAction<number>) => {
      onStateChange((prev) => {
        const nextHi = typeof action === "function" ? action(prev.hi) : action
        return { ...prev, hi: Math.max(0, nextHi) }
      })
    },
    [onStateChange]
  )

  const onFilterQueryChange = useCallback(
    (value: string) => {
      onStateChange((prev) => ({ ...prev, filterQuery: value }))
    },
    [onStateChange]
  )

  const onSetFold = useCallback(
    (viewIndex: number, expanded: boolean) => {
      const rowIndex = visibleIndices[viewIndex]
      if (rowIndex === undefined) {
        return
      }
      const row = state.rows[rowIndex]
      if (row === undefined || row.kind !== "folder") {
        return
      }
      if (expanded) {
        expandBookmarkFolder(row.bookmarkId)
      } else {
        collapseBookmarkFolder(row.bookmarkId)
      }
      setFoldRevision((n) => n + 1)
    },
    [state.rows, visibleIndices]
  )

  const onToggleMark = useCallback(
    (viewIndex: number) => {
      if (state.phase === "movePickFolder") {
        return
      }
      const rowIndex = visibleIndices[viewIndex]
      if (rowIndex === undefined) {
        return
      }
      const row = state.rows[rowIndex]
      if (row === undefined) {
        return
      }
      const next = toggleBookmarkRowMark(state, row)
      if (next === state) {
        void onAppendLog([tBookmark("bookmark.picker.markKindMismatch", locale)])
        return
      }
      onStateChange(() => next)
    },
    [locale, onAppendLog, onStateChange, state, visibleIndices]
  )

  const onMenuClose = useCallback(() => {
    setMenuMode("actions")
    onStateChange((prev) => ({ ...prev, actionMenuOpen: false, actionMenuIndex: 0 }))
  }, [onStateChange])

  const confirmMoveToFolder = useCallback(
    (folderId: string) => {
      if (state.moveIds.includes(folderId)) {
        void onAppendLog([tBookmark("bookmark.picker.move.selfParent", locale)])
        return
      }
      const moveTargets = state.rows.filter((row) => state.moveIds.includes(row.bookmarkId))
      const line = buildBookmarkActionLine("move", moveTargets, { parentId: folderId })
      if (line === null) {
        void onAppendLog([tBookmark("bookmark.picker.move.invalid", locale)])
        return
      }
      onStateChange((prev) => ({
        ...clearBookmarkPickerMarks(prev),
        phase: "browse",
        moveIds: [],
        actionMenuOpen: false,
        actionMenuIndex: 0
      }))
      submitConstructedLine(line)
    },
    [locale, onAppendLog, onStateChange, state.moveIds, state.rows, submitConstructedLine]
  )

  const onOpenMenu = useCallback(() => {
    if (state.phase === "movePickFolder") {
      if (highlightedRow === null || highlightedRow.kind !== "folder") {
        void onAppendLog([tBookmark("bookmark.picker.move.needFolder", locale)])
        return
      }
      confirmMoveToFolder(highlightedRow.bookmarkId)
      return
    }
    if (actions.length === 0) {
      return
    }
    setMenuMode("actions")
    onStateChange((prev) => ({ ...prev, actionMenuOpen: true, actionMenuIndex: 0 }))
  }, [
    actions.length,
    confirmMoveToFolder,
    highlightedRow,
    locale,
    onAppendLog,
    onStateChange,
    state.phase
  ])

  const onMenuPickIndexChange = useCallback(
    (index: number) => {
      onStateChange((prev) => ({ ...prev, actionMenuIndex: index }))
    },
    [onStateChange]
  )

  const onMenuConfirm = useCallback(() => {
    if (menuMode === "sendPeers") {
      const peer = syncStatus.connectedPeers[state.actionMenuIndex]
      if (peer === undefined) {
        onMenuClose()
        return
      }
      const line = buildBookmarkActionLine("send", targets, { deviceId: peer.deviceId })
      if (line === null) {
        void onAppendLog([tBookmark("bookmark.picker.send.invalid", locale)])
        onMenuClose()
        return
      }
      onStateChange((prev) => ({
        ...clearBookmarkPickerMarks(prev),
        actionMenuOpen: false,
        actionMenuIndex: 0
      }))
      setMenuMode("actions")
      submitConstructedLine(line)
      return
    }

    const action = actions[state.actionMenuIndex]
    if (action === undefined) {
      onMenuClose()
      return
    }

    if (action === "move") {
      const ids = targets.map((row) => row.bookmarkId)
      onStateChange((prev) => ({
        ...prev,
        phase: "movePickFolder",
        moveIds: ids,
        actionMenuOpen: false,
        actionMenuIndex: 0
      }))
      setMenuMode("actions")
      void onAppendLog([tBookmark("bookmark.picker.move.pickHint", locale)])
      return
    }

    if (action === "send") {
      const peers = syncStatus.connectedPeers
      if (peers.length === 0) {
        void onAppendLog([tBookmark("bookmark.picker.send.noPeers", locale)])
        onMenuClose()
        return
      }
      if (peers.length === 1) {
        const line = buildBookmarkActionLine("send", targets, { deviceId: peers[0]!.deviceId })
        if (line === null) {
          void onAppendLog([tBookmark("bookmark.picker.send.invalid", locale)])
          onMenuClose()
          return
        }
        onStateChange((prev) => ({
          ...clearBookmarkPickerMarks(prev),
          actionMenuOpen: false,
          actionMenuIndex: 0
        }))
        setMenuMode("actions")
        submitConstructedLine(line)
        return
      }
      setMenuMode("sendPeers")
      onStateChange((prev) => ({ ...prev, actionMenuIndex: 0 }))
      return
    }

    const line = buildBookmarkActionLine(action, targets)
    if (line === null) {
      void onAppendLog([tBookmark("bookmark.picker.noUrl", locale)])
      onMenuClose()
      return
    }
    const removedIds: string[] = []
    if (action === "remove") {
      for (const row of targets) {
        removedIds.push(row.bookmarkId)
      }
    }
    onStateChange((prev) => {
      const closed: BookmarkPickerState = {
        ...clearBookmarkPickerMarks(prev),
        actionMenuOpen: false,
        actionMenuIndex: 0
      }
      if (action !== "remove") {
        return closed
      }
      return { ...closed, rows: removeBookmarkRowsById(prev.rows, removedIds) }
    })
    setMenuMode("actions")
    submitConstructedLine(line)
  }, [
    actions,
    locale,
    menuMode,
    onAppendLog,
    onMenuClose,
    onStateChange,
    state.actionMenuIndex,
    submitConstructedLine,
    syncStatus.connectedPeers,
    targets
  ])

  const onReturnFromPicker = useCallback(() => {
    if (state.phase === "movePickFolder") {
      onStateChange((prev) => ({
        ...prev,
        phase: "browse",
        moveIds: []
      }))
      return
    }
    onReturnToPrompt()
  }, [onReturnToPrompt, onStateChange, state.phase])

  const menu = useMemo((): TreePickerActionMenu | null => {
    if (!state.actionMenuOpen) {
      return null
    }
    if (menuMode === "sendPeers") {
      const peers = syncStatus.connectedPeers
      if (peers.length === 0) {
        return null
      }
      return {
        title: tBookmark("bookmark.picker.send.peerTitle", locale, { count: targets.length }),
        hint: tBookmark("bookmark.picker.actionMenu.hint", locale),
        targetLabels: targets.map((row) => bookmarkTargetLabel(row)),
        items: peers.map((peer) => ({
          id: peer.deviceId,
          label: peer.displayName.length > 0 ? peer.displayName : peer.deviceId
        })),
        pickIndex: Math.min(state.actionMenuIndex, peers.length - 1)
      }
    }
    if (actions.length === 0) {
      return null
    }
    return {
      title: tBookmark("bookmark.picker.actionMenu.title", locale, { count: targets.length }),
      hint: tBookmark("bookmark.picker.actionMenu.hint", locale),
      targetLabels: targets.map((row) => bookmarkTargetLabel(row)),
      items: actions.map((action) => ({
        id: action,
        label: tBookmark(actionLabelKey(action), locale)
      })),
      pickIndex: Math.min(state.actionMenuIndex, actions.length - 1)
    }
  }, [
    actions,
    locale,
    menuMode,
    state.actionMenuIndex,
    state.actionMenuOpen,
    syncStatus.connectedPeers,
    targets
  ])

  const headline =
    state.phase === "movePickFolder"
      ? tBookmark("bookmark.picker.move.headline", locale)
      : tBookmark("bookmark.picker.hint", locale)

  return (
    <TreePickerBody
      headline={headline}
      emptyText={tBookmark("bookmark.picker.empty", locale)}
      inputAriaLabel={tBookmark("bookmark.picker.inputAria", locale)}
      listAriaLabel={tBookmark("bookmark.picker.listAria", locale)}
      views={views}
      hi={hi}
      onHiChange={onHiChange}
      filterQuery={state.filterQuery}
      onFilterQueryChange={onFilterQueryChange}
      menu={menu}
      onMenuPickIndexChange={onMenuPickIndexChange}
      onMenuConfirm={onMenuConfirm}
      onMenuClose={onMenuClose}
      onOpenMenu={onOpenMenu}
      onSetFold={onSetFold}
      onToggleMark={onToggleMark}
      onReturnToPrompt={onReturnFromPicker}
      onExitToDetailBar={
        state.phase === "movePickFolder"
          ? () =>
              onStateChange((prev) => ({
                ...prev,
                phase: "browse",
                moveIds: []
              }))
          : onExitToDetailBar
      }
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
    />
  )
}
