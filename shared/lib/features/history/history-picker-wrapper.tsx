import { useCallback, useMemo, useState } from "react"
import type { MutableRefObject, SetStateAction } from "react"
import { tHistory } from "../setting/i18n/ns/history"
import { useUiSettings } from "../setting/use-ui-settings"
import { TreePickerBody } from "../side-picker/tree/tree-picker-body"
import type { TreePickerActionMenu } from "../side-picker/tree/tree-picker-types"
import {
  collapseHistoryDay,
  collapseHistoryMonth,
  computeHistoryVisibleRowIndices,
  expandHistoryDay,
  expandHistoryMonth
} from "./fold-state"
import {
  computeHistorySearchFilteredVisibleIndices,
  expandHistoryFoldsForSearchMatches
} from "./history-search-visibility"
import {
  clearHistoryPickerMarks,
  historyActionTargetRows,
  toggleHistoryRowMark,
  type HistoryPickerState
} from "./history-picker-state"
import {
  buildHistoryActionLine,
  buildHistoryTreeViews,
  historyActionsForTargets,
  historyTargetLabel,
  removeHistoryRows,
  type HistoryActionId
} from "./history-picker-view"

export type HistoryPickerWrapperProps = {
  state: HistoryPickerState
  onStateChange: (update: (prev: HistoryPickerState) => HistoryPickerState) => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  /** EN: Typed-line submission (`history -delete …`, `open …`); no direct chrome.history calls. */
  submitConstructedLine: (line: string) => void
  onAppendLog: (lines: string[]) => void | Promise<void>
}

function actionLabelKey(
  action: HistoryActionId
):
  | "history.picker.action.open"
  | "history.picker.action.delete"
  | "history.picker.action.deleteRange" {
  if (action === "open") {
    return "history.picker.action.open"
  }
  if (action === "delete") {
    return "history.picker.action.delete"
  }
  return "history.picker.action.deleteRange"
}

export function HistoryPickerWrapper({
  state,
  onStateChange,
  onReturnToPrompt,
  onExitToDetailBar,
  keyboardActive = false,
  pickerInputRef,
  submitConstructedLine,
  onAppendLog
}: HistoryPickerWrapperProps) {
  const { settings } = useUiSettings()
  const locale = settings.locale
  // EN: Fold state lives in module-level sets; bump this to recompute visible rows.
  const [foldRevision, setFoldRevision] = useState(0)

  const foldVisibleIndices = useMemo(
    () => computeHistoryVisibleRowIndices(state.rows),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foldRevision signals external fold-state change
    [state.rows, foldRevision]
  )
  const visibleIndices = useMemo(
    () =>
      computeHistorySearchFilteredVisibleIndices(
        state.rows,
        state.filterQuery,
        foldVisibleIndices
      ),
    [foldVisibleIndices, state.filterQuery, state.rows]
  )
  const views = useMemo(
    () => buildHistoryTreeViews(state, visibleIndices),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- foldRevision signals external fold-state; omit `state`/`hi` so arrow nav does not rebuild all views
    [
      state.rows,
      state.markedMonthKeys,
      state.markedDayKeys,
      state.markedVisitUrls,
      visibleIndices,
      foldRevision
    ]
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
    () => historyActionTargetRows(state, highlightedRow),
    [highlightedRow, state]
  )
  const actions = useMemo(() => historyActionsForTargets(targets), [targets])

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
      onStateChange((prev) => ({ ...prev, filterQuery: value, hi: 0 }))
    },
    [onStateChange]
  )

  const onSearchCommit = useCallback(
    (pattern: string) => {
      if (expandHistoryFoldsForSearchMatches(state.rows, pattern)) {
        setFoldRevision((n) => n + 1)
      }
    },
    [state.rows]
  )

  const onSetFold = useCallback(
    (viewIndex: number, expanded: boolean) => {
      const rowIndex = visibleIndices[viewIndex]
      if (rowIndex === undefined) {
        return
      }
      const row = state.rows[rowIndex]
      if (row === undefined) {
        return
      }
      if (row.kind === "month") {
        if (expanded) {
          expandHistoryMonth(row.monthKey)
        } else {
          collapseHistoryMonth(row.monthKey)
        }
        setFoldRevision((n) => n + 1)
        return
      }
      if (row.kind === "day") {
        if (expanded) {
          expandHistoryDay(row.dayKey)
        } else {
          collapseHistoryDay(row.dayKey)
        }
        setFoldRevision((n) => n + 1)
      }
    },
    [state.rows, visibleIndices]
  )

  const onToggleMark = useCallback(
    (viewIndex: number) => {
      const rowIndex = visibleIndices[viewIndex]
      if (rowIndex === undefined) {
        return
      }
      const row = state.rows[rowIndex]
      if (row === undefined) {
        return
      }
      const next = toggleHistoryRowMark(state, row)
      if (next === state) {
        void onAppendLog([tHistory("history.picker.markKindMismatch", locale)])
        return
      }
      onStateChange(() => next)
    },
    [locale, onAppendLog, onStateChange, state, visibleIndices]
  )

  const onOpenMenu = useCallback(() => {
    if (actions.length === 0) {
      return
    }
    onStateChange((prev) => ({ ...prev, actionMenuOpen: true, actionMenuIndex: 0 }))
  }, [actions.length, onStateChange])

  const onMenuClose = useCallback(() => {
    onStateChange((prev) => ({ ...prev, actionMenuOpen: false, actionMenuIndex: 0 }))
  }, [onStateChange])

  const onMenuPickIndexChange = useCallback(
    (index: number) => {
      onStateChange((prev) => ({ ...prev, actionMenuIndex: index }))
    },
    [onStateChange]
  )

  const onMenuConfirm = useCallback(() => {
    const action = actions[state.actionMenuIndex]
    if (action === undefined) {
      onMenuClose()
      return
    }
    const line = buildHistoryActionLine(action, targets)
    if (line === null) {
      void onAppendLog([tHistory("history.picker.noUrl", locale)])
      onMenuClose()
      return
    }
    const removedUrls: string[] = []
    const removedDays: string[] = []
    const removedMonths: string[] = []
    for (const row of targets) {
      if (action === "delete" && row.kind === "visit") {
        removedUrls.push(row.url)
      }
      if (action === "deleteRange" && row.kind === "day") {
        removedDays.push(row.dayKey)
      }
      if (action === "deleteRange" && row.kind === "month") {
        removedMonths.push(row.monthKey)
      }
    }
    onStateChange((prev) => {
      const closed: HistoryPickerState = {
        ...clearHistoryPickerMarks(prev),
        actionMenuOpen: false,
        actionMenuIndex: 0
      }
      if (action === "open") {
        return closed
      }
      return {
        ...closed,
        rows: removeHistoryRows(prev.rows, {
          urls: removedUrls,
          dayKeys: removedDays,
          monthKeys: removedMonths
        })
      }
    })
    submitConstructedLine(line)
  }, [
    actions,
    locale,
    onAppendLog,
    onMenuClose,
    onStateChange,
    state.actionMenuIndex,
    submitConstructedLine,
    targets
  ])

  const menu = useMemo((): TreePickerActionMenu | null => {
    if (!state.actionMenuOpen || actions.length === 0) {
      return null
    }
    return {
      title: tHistory("history.picker.actionMenu.title", locale, { count: targets.length }),
      hint: tHistory("history.picker.actionMenu.hint", locale),
      targetLabels: targets.map((row) => historyTargetLabel(row)),
      items: actions.map((action) => ({
        id: action,
        label: tHistory(actionLabelKey(action), locale)
      })),
      pickIndex: Math.min(state.actionMenuIndex, actions.length - 1)
    }
  }, [actions, locale, state.actionMenuIndex, state.actionMenuOpen, targets])

  return (
    <TreePickerBody
      headline={tHistory("history.picker.hint", locale)}
      emptyText={tHistory("history.picker.empty", locale)}
      inputAriaLabel={tHistory("history.picker.inputAria", locale)}
      listAriaLabel={tHistory("history.picker.listAria", locale)}
      views={views}
      hi={hi}
      onHiChange={onHiChange}
      filterQuery={state.filterQuery}
      onFilterQueryChange={onFilterQueryChange}
      onSearchCommit={onSearchCommit}
      menu={menu}
      onMenuPickIndexChange={onMenuPickIndexChange}
      onMenuConfirm={onMenuConfirm}
      onMenuClose={onMenuClose}
      onOpenMenu={onOpenMenu}
      onSetFold={onSetFold}
      onToggleMark={onToggleMark}
      onReturnToPrompt={onReturnToPrompt}
      onExitToDetailBar={onExitToDetailBar}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
    />
  )
}
