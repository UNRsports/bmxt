import { useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react"
import {
  cyclePickerCommandCompletion,
  type PickerCommandCompletionState
} from "../interaction/picker-command-completion"
import {
  runPickerCommandEnter as runPickerCommandEnterKernel,
  type RunPickerCommandEnterOptions
} from "../interaction/picker-command-enter"
import {
  pickerOpenCommandChord,
  pickerOpenSearchChord,
  pickerPlainTypingKey
} from "../interaction/picker-key-event"
import { runPickerWindowCaptureChain } from "../interaction/picker-list-kernel"
import type { PlainPickerKeyboardExtensions } from "../interaction/plain-picker-keyboard-extensions"
import { runPickerSearchEnter, type RunPickerSearchEnterOptions } from "../interaction/picker-search-enter"
import { runPickerSearchJump, type RunPickerSearchJumpOptions } from "../interaction/picker-search-jump"
import { verticalNavDirection } from "../interaction/picker-vertical-nav"
import { filterUrlListCommandCompletions } from "../interaction/url-list-commands"
import { plainPickerHiIndicesMatching } from "../search/plain-picker-search"
import { useWindowKeydownCapture } from "./use-window-keydown-capture"

export type UsePlainPickerKeyboardOptions = {
  lineCount: number
  keyboardActive: boolean
  sessionId?: string
  enableCommandMode?: boolean
  onReturnToPrompt: () => void
  onConfirmLineIndex?: (index: number) => void
  hi: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  setSearchMode: Dispatch<SetStateAction<boolean>>
  filterQuery: string
  setFilterQuery: Dispatch<SetStateAction<string>>
  hlSearchPattern: string
  setHlSearchPattern: Dispatch<SetStateAction<string>>
  commandMode: boolean
  setCommandMode: Dispatch<SetStateAction<boolean>>
  commandBuffer: string
  setCommandBuffer: Dispatch<SetStateAction<string>>
  setCommandListingHint: Dispatch<SetStateAction<boolean>>
  matchLines?: readonly string[]
  extensions?: PlainPickerKeyboardExtensions
}

export type UsePlainPickerKeyboardResult = {
  onWindowKeydownCapture: (ev: KeyboardEvent) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function usePlainPickerKeyboard({
  lineCount,
  keyboardActive,
  sessionId,
  enableCommandMode = false,
  onReturnToPrompt,
  onConfirmLineIndex,
  hi,
  setHi,
  searchMode,
  setSearchMode,
  filterQuery,
  setFilterQuery,
  hlSearchPattern,
  setHlSearchPattern,
  commandMode,
  setCommandMode,
  commandBuffer,
  setCommandBuffer,
  setCommandListingHint,
  matchLines,
  extensions
}: UsePlainPickerKeyboardOptions): UsePlainPickerKeyboardResult {
  const commandCompletionRef = useRef<PickerCommandCompletionState | null>(null)

  const clearCommandMode = useCallback(() => {
    commandCompletionRef.current = null
    setCommandMode(false)
    setCommandBuffer("")
    setCommandListingHint(false)
  }, [setCommandBuffer, setCommandListingHint, setCommandMode])

  const closeSearch = useCallback(() => {
    setSearchMode(false)
    setFilterQuery("")
  }, [setFilterQuery, setSearchMode])

  const runDefaultVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => Math.min(h + 1, lineCount - 1))
        return true
      }
      if (dir === "up") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => Math.max(h - 1, 0))
        return true
      }
      return false
    },
    [keyboardActive, lineCount, setHi]
  )

  const runPickerVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      // IME textarea shows filter/command text; j/k and arrows must reach the input, not hi.
      if (searchMode || commandMode) {
        return false
      }
      if (extensions?.customVerticalNav) {
        return extensions.customVerticalNav(e)
      }
      return runDefaultVerticalNav(e)
    },
    [commandMode, extensions, runDefaultVerticalNav, searchMode]
  )

  const defaultSearchJumpEnabled =
    keyboardActive && !searchMode && !commandMode && hlSearchPattern !== ""

  const searchJumpOptions = useMemo(
    (): RunPickerSearchJumpOptions => ({
      enabled: extensions?.isSearchJumpEnabled?.() ?? defaultSearchJumpEnabled,
      hi,
      highlightPattern: hlSearchPattern,
      matchIndices: () => {
        if (extensions?.matchIndices) {
          return extensions.matchIndices()
        }
        if (matchLines) {
          return plainPickerHiIndicesMatching(matchLines, hlSearchPattern)
        }
        return []
      },
      onJump: (target) => setHi(target)
    }),
    [
      defaultSearchJumpEnabled,
      extensions,
      hi,
      hlSearchPattern,
      matchLines,
      setHi
    ]
  )

  const searchEnterOptions = useMemo(
    (): RunPickerSearchEnterOptions => ({
      searchMode,
      filterQuery,
      onCommit: (pattern) => {
        setHlSearchPattern(pattern)
        setSearchMode(false)
        setFilterQuery("")
      }
    }),
    [filterQuery, searchMode, setFilterQuery, setHlSearchPattern, setSearchMode]
  )

  const filterCompletions = extensions?.filterCommandCompletions ?? filterUrlListCommandCompletions

  const commandEnterOptions = useMemo((): RunPickerCommandEnterOptions | undefined => {
    if (!enableCommandMode && !extensions?.onCommandEnter) {
      return undefined
    }
    return {
      commandMode,
      commandBuffer,
      onEmptyEnter: extensions?.onCommandEmptyEnter,
      onNohlsearch: () => {
        clearCommandMode()
        setHlSearchPattern("")
        closeSearch()
      },
      onCommand: (buffer) => {
        if (extensions?.onCommandEnter) {
          return extensions.onCommandEnter(buffer)
        }
        if (!enableCommandMode) {
          return false
        }
        clearCommandMode()
        setHlSearchPattern("")
        closeSearch()
        return true
      }
    }
  }, [
    clearCommandMode,
    closeSearch,
    commandBuffer,
    commandMode,
    enableCommandMode,
    extensions,
    setHlSearchPattern
  ])

  const runPickerNormalEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      if (extensions?.onNormalEnter) {
        return extensions.onNormalEnter(e)
      }
      if (!keyboardActive || searchMode || commandMode) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || e.key !== "Enter" || e.shiftKey) {
        return false
      }
      if (!onConfirmLineIndex || lineCount === 0) {
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      onConfirmLineIndex(hi)
      return true
    },
    [commandMode, extensions, hi, keyboardActive, lineCount, onConfirmLineIndex, searchMode]
  )

  const runPlainEsc = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "Escape") {
        return false
      }
      if (extensions?.onEsc?.(e)) {
        return true
      }
      e.preventDefault()
      e.stopPropagation()
      if (commandMode) {
        clearCommandMode()
        return true
      }
      if (searchMode) {
        closeSearch()
        return true
      }
      onReturnToPrompt()
      return true
    },
    [clearCommandMode, closeSearch, commandMode, extensions, onReturnToPrompt, searchMode]
  )

  const onWindowKeydownCapture = useCallback(
    (ev: KeyboardEvent) => {
      if (!keyboardActive) {
        return
      }
      if (extensions?.onCaptureBefore?.(ev)) {
        return
      }
      if (
        runPickerWindowCaptureChain(ev, sessionId ?? "", {
          paneStrip: Boolean(sessionId),
          verticalNav: runPickerVerticalNav,
          searchJump: searchJumpOptions,
          searchEnter: searchEnterOptions,
          commandEnter: commandEnterOptions,
          customEnter: runPickerNormalEnter
        })
      ) {
        return
      }
      if (extensions?.onCaptureAfter?.(ev)) {
        return
      }
      runPlainEsc(ev)
    },
    [
      commandEnterOptions,
      extensions,
      keyboardActive,
      runPickerNormalEnter,
      runPickerVerticalNav,
      runPlainEsc,
      searchEnterOptions,
      searchJumpOptions,
      sessionId
    ]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive || e.nativeEvent.isComposing) {
        return
      }
      const native = e.nativeEvent
      if (extensions?.onInputBeforePlain?.(e)) {
        return
      }
      if (runPickerVerticalNav(native)) {
        return
      }
      if (runPickerSearchJump(native, searchJumpOptions)) {
        return
      }
      if (runPickerSearchEnter(native, searchEnterOptions)) {
        return
      }
      if (commandEnterOptions && runPickerCommandEnterKernel(native, commandEnterOptions)) {
        return
      }
      if (runPickerNormalEnter(native)) {
        return
      }
      if (e.key === "Escape") {
        if (extensions?.onEsc?.(native)) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        if (commandMode) {
          clearCommandMode()
          return
        }
        if (searchMode) {
          closeSearch()
          return
        }
        onReturnToPrompt()
        return
      }
      if (
        enableCommandMode &&
        pickerOpenCommandChord(native) &&
        !searchMode &&
        !commandMode &&
        !(extensions?.blockOpenChords?.() ?? false)
      ) {
        e.preventDefault()
        setCommandMode(true)
        setCommandBuffer("")
        setCommandListingHint(false)
        return
      }
      if (
        pickerOpenSearchChord(native) &&
        !commandMode &&
        !(extensions?.blockOpenChords?.() ?? false)
      ) {
        e.preventDefault()
        if (!searchMode) {
          setSearchMode(true)
        }
        return
      }
      if (commandMode && e.key === "Tab") {
        e.preventDefault()
        if (commandBuffer.trim() === "") {
          setCommandListingHint(true)
        }
        const cycled = cyclePickerCommandCompletion(
          commandCompletionRef.current,
          commandBuffer,
          filterCompletions(commandBuffer)
        )
        if (cycled === null) {
          return
        }
        commandCompletionRef.current = cycled.state
        setCommandBuffer(cycled.value)
        return
      }
      if (commandMode && e.key !== "Tab") {
        commandCompletionRef.current = null
      }
      if (extensions?.onInputAfterPlain?.(e)) {
        return
      }
      if (
        !searchMode &&
        !commandMode &&
        pickerPlainTypingKey(native) &&
        !(extensions?.blockPlainTyping?.() ?? false)
      ) {
        e.preventDefault()
      }
    },
    [
      clearCommandMode,
      closeSearch,
      commandBuffer,
      commandEnterOptions,
      commandMode,
      enableCommandMode,
      extensions,
      filterCompletions,
      keyboardActive,
      onReturnToPrompt,
      runPickerNormalEnter,
      runPickerVerticalNav,
      searchEnterOptions,
      searchJumpOptions,
      searchMode,
      setCommandBuffer,
      setCommandListingHint,
      setCommandMode,
      setSearchMode
    ]
  )

  return { onWindowKeydownCapture, onInputKeyDown }
}
