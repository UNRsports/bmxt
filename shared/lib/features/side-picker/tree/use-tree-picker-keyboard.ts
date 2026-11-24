import { useCallback, useMemo } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useWindowKeydownCapture } from "../hooks/use-window-keydown-capture"
import {
  pickerArrowLeft,
  pickerArrowRight,
  pickerOpenCommandChord,
  pickerOpenSearchChord,
  pickerPlainTypingKey
} from "../interaction/picker-key-event"
import {
  runPickerCommandEnter,
  type RunPickerCommandEnterOptions
} from "../interaction/picker-command-enter"
import {
  runPickerSearchEnter,
  type RunPickerSearchEnterOptions
} from "../interaction/picker-search-enter"
import {
  runPickerSearchJump,
  type RunPickerSearchJumpOptions
} from "../interaction/picker-search-jump"
import { verticalNavDirection } from "../interaction/picker-vertical-nav"
import { treePickerVisibleHiIndicesMatching } from "./tree-picker-search"
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
  hlSearchPattern: string
  setHlSearchPattern: Dispatch<SetStateAction<string>>
  /** EN: Command wrapper hook — expand matching folds when `/` is committed. */
  onSearchCommit?: (pattern: string) => void
  commandMode: boolean
  setCommandMode: Dispatch<SetStateAction<boolean>>
  commandBuffer: string
  setCommandBuffer: Dispatch<SetStateAction<string>>
  setCommandListingHint: Dispatch<SetStateAction<boolean>>
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

export function useTreePickerKeyboard({
  keyboardActive,
  views,
  hi,
  setHi,
  searchMode,
  setSearchMode,
  filterQuery,
  onFilterQueryChange,
  hlSearchPattern,
  setHlSearchPattern,
  onSearchCommit,
  commandMode,
  setCommandMode,
  commandBuffer,
  setCommandBuffer,
  setCommandListingHint,
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
  const closeSearch = useCallback(() => {
    onFilterQueryChange("")
    setSearchMode(false)
  }, [onFilterQueryChange, setSearchMode])

  const closeCommand = useCallback(() => {
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
  }, [setCommandBuffer, setCommandListingHint, setCommandMode])

  const searchEnterOptions = useMemo((): RunPickerSearchEnterOptions => {
    return {
      searchMode,
      filterQuery,
      onCommit: (pattern) => {
        onSearchCommit?.(pattern)
        setHlSearchPattern(pattern)
        setSearchMode(false)
        onFilterQueryChange("")
      }
    }
  }, [
    filterQuery,
    onFilterQueryChange,
    onSearchCommit,
    searchMode,
    setHlSearchPattern,
    setSearchMode
  ])

  const searchJumpOptions = useMemo((): RunPickerSearchJumpOptions => {
    return {
      enabled: keyboardActive && !searchMode && !commandMode && !menuOpen,
      hi,
      highlightPattern: hlSearchPattern,
      matchIndices: () => treePickerVisibleHiIndicesMatching(views, hlSearchPattern),
      onJump: (targetHi) => setHi(targetHi)
    }
  }, [
    commandMode,
    hi,
    hlSearchPattern,
    keyboardActive,
    menuOpen,
    searchMode,
    setHi,
    views
  ])

  const commandEnterOptions = useMemo((): RunPickerCommandEnterOptions => {
    return {
      commandMode,
      commandBuffer,
      onEmptyEnter: () => setCommandListingHint(true),
      onNohlsearch: () => {
        setHlSearchPattern("")
        closeCommand()
        closeSearch()
      }
    }
  }, [
    closeCommand,
    closeSearch,
    commandBuffer,
    commandMode,
    setCommandListingHint,
    setHlSearchPattern
  ])

  const handleSearchKey = useCallback(
    (e: KeyboardEvent): boolean => {
      if (runPickerSearchEnter(e, searchEnterOptions)) {
        return true
      }
      if (e.key === "Escape") {
        stopKey(e)
        closeSearch()
        return true
      }
      return false
    },
    [closeSearch, searchEnterOptions]
  )

  const handleCommandKey = useCallback(
    (e: KeyboardEvent): boolean => {
      if (runPickerCommandEnter(e, commandEnterOptions)) {
        return true
      }
      if (e.key === "Escape") {
        stopKey(e)
        closeCommand()
        return true
      }
      return false
    },
    [closeCommand, commandEnterOptions]
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
      if (runPickerSearchJump(e, searchJumpOptions)) {
        return true
      }
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
        closeCommand()
        setSearchMode(true)
        return true
      }
      if (pickerOpenCommandChord(e)) {
        stopKey(e)
        closeSearch()
        setCommandMode(true)
        setCommandBuffer("")
        setCommandListingHint(false)
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
      closeCommand,
      closeSearch,
      hi,
      onExitToDetailBar,
      onOpenMenu,
      onReturnToPrompt,
      onSetFold,
      onToggleMark,
      searchJumpOptions,
      setCommandBuffer,
      setCommandListingHint,
      setCommandMode,
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
      if (commandMode) {
        handleCommandKey(e)
        return
      }
      if (menuOpen) {
        handleMenuKey(e)
        return
      }
      handleListKey(e)
    },
    [
      commandMode,
      handleCommandKey,
      handleListKey,
      handleMenuKey,
      handleSearchKey,
      keyboardActive,
      menuOpen,
      searchMode
    ]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive || e.nativeEvent.isComposing) {
        return
      }
      if (!searchMode && !commandMode && pickerPlainTypingKey(e.nativeEvent)) {
        e.preventDefault()
      }
    },
    [commandMode, keyboardActive, searchMode]
  )

  return { onInputKeyDown }
}
