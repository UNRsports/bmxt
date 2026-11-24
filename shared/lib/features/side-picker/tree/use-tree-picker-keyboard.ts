import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useWindowKeydownCapture } from "../hooks/use-window-keydown-capture"
import {
  pickerArrowLeft,
  pickerArrowRight,
  pickerOpenSearchChord,
  pickerPlainTypingKey
} from "../interaction/picker-key-event"
import { verticalNavDirection } from "../interaction/picker-vertical-nav"
import type { TreePickerRowView } from "./tree-picker-types"

export type UseTreePickerKeyboardOptions = {
  keyboardActive: boolean
  views: readonly TreePickerRowView[]
  hi: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  setSearchMode: Dispatch<SetStateAction<boolean>>
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  menuOpen: boolean
  menuItemCount: number
  menuPickIndex: number
  onMenuPickIndexChange: (index: number) => void
  onMenuConfirm: () => void
  onMenuClose: () => void
  onOpenMenu: () => void
  /** EN: Fold (false) or unfold (true) the header at the highlighted row. */
  onSetFold: (viewIndex: number, expanded: boolean) => void
  onToggleMark: (viewIndex: number) => void
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
}

export type UseTreePickerKeyboardResult = {
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

function stopKey(e: KeyboardEvent): void {
  e.preventDefault()
  e.stopPropagation()
}

/** EN: Index of the next view whose label/detail contains the query (wraps), or -1. */
export function findTreePickerSearchMatch(
  views: readonly TreePickerRowView[],
  fromIndex: number,
  query: string
): number {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0 || views.length === 0) {
    return -1
  }
  for (let step = 1; step <= views.length; step += 1) {
    const index = (fromIndex + step) % views.length
    const view = views[index]!
    if (view.label.toLowerCase().includes(needle)) {
      return index
    }
    if (view.detail !== null && view.detail.toLowerCase().includes(needle)) {
      return index
    }
  }
  return -1
}

export function useTreePickerKeyboard({
  keyboardActive,
  views,
  hi,
  setHi,
  searchMode,
  setSearchMode,
  filterQuery,
  onFilterQueryChange,
  menuOpen,
  menuItemCount,
  menuPickIndex,
  onMenuPickIndexChange,
  onMenuConfirm,
  onMenuClose,
  onOpenMenu,
  onSetFold,
  onToggleMark,
  onReturnToPrompt,
  onExitToDetailBar
}: UseTreePickerKeyboardOptions): UseTreePickerKeyboardResult {
  const handleSearchKey = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key === "Enter" && !e.shiftKey) {
        stopKey(e)
        const target = findTreePickerSearchMatch(views, hi, filterQuery)
        if (target >= 0) {
          setHi(target)
        }
        setSearchMode(false)
        return true
      }
      if (e.key === "Escape") {
        stopKey(e)
        onFilterQueryChange("")
        setSearchMode(false)
        return true
      }
      return false
    },
    [filterQuery, hi, onFilterQueryChange, setHi, setSearchMode, views]
  )

  const handleMenuKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        stopKey(e)
        const last = Math.max(0, menuItemCount - 1)
        onMenuPickIndexChange(Math.min(menuPickIndex + 1, last))
        return true
      }
      if (dir === "up") {
        stopKey(e)
        onMenuPickIndexChange(Math.max(menuPickIndex - 1, 0))
        return true
      }
      if (e.key === "Enter" && !e.shiftKey) {
        stopKey(e)
        onMenuConfirm()
        return true
      }
      if (e.key === "Escape" || pickerArrowLeft(e)) {
        stopKey(e)
        onMenuClose()
        return true
      }
      // EN: Swallow everything else while the menu is open so rows do not move underneath.
      if (pickerArrowRight(e)) {
        stopKey(e)
        return true
      }
      return false
    },
    [menuItemCount, menuPickIndex, onMenuClose, onMenuConfirm, onMenuPickIndexChange]
  )

  const handleListKey = useCallback(
    (e: KeyboardEvent): boolean => {
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        stopKey(e)
        setHi((h) => Math.min(h + 1, Math.max(0, views.length - 1)))
        return true
      }
      if (dir === "up") {
        stopKey(e)
        setHi((h) => Math.max(h - 1, 0))
        return true
      }
      const view = views[hi]
      if (view === undefined) {
        if (e.key === "Escape") {
          stopKey(e)
          onReturnToPrompt()
          return true
        }
        if (pickerArrowLeft(e) && onExitToDetailBar) {
          stopKey(e)
          onExitToDetailBar()
          return true
        }
        return false
      }
      if (pickerArrowLeft(e)) {
        stopKey(e)
        if (view.foldable && view.expanded) {
          onSetFold(hi, false)
          return true
        }
        if (onExitToDetailBar) {
          onExitToDetailBar()
        }
        return true
      }
      if (pickerArrowRight(e)) {
        stopKey(e)
        if (view.foldable && !view.expanded) {
          onSetFold(hi, true)
          return true
        }
        onOpenMenu()
        return true
      }
      if (e.key === "Enter" && !e.shiftKey) {
        stopKey(e)
        onOpenMenu()
        return true
      }
      if (e.key === " ") {
        stopKey(e)
        onToggleMark(hi)
        return true
      }
      if (pickerOpenSearchChord(e)) {
        stopKey(e)
        setSearchMode(true)
        return true
      }
      if (e.key === "Escape") {
        stopKey(e)
        onReturnToPrompt()
        return true
      }
      return false
    },
    [
      hi,
      onExitToDetailBar,
      onOpenMenu,
      onReturnToPrompt,
      onSetFold,
      onToggleMark,
      setHi,
      setSearchMode,
      views
    ]
  )

  const onWindowKeydownCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!keyboardActive) {
        return
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing) {
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      if (searchMode) {
        handleSearchKey(e)
        return
      }
      if (menuOpen) {
        handleMenuKey(e)
        return
      }
      handleListKey(e)
    },
    [handleListKey, handleMenuKey, handleSearchKey, keyboardActive, menuOpen, searchMode]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive || e.nativeEvent.isComposing) {
        return
      }
      // EN: Keep the hidden IME textarea empty outside search mode.
      if (!searchMode && pickerPlainTypingKey(e.nativeEvent)) {
        e.preventDefault()
      }
    },
    [keyboardActive, searchMode]
  )

  return { onInputKeyDown }
}
