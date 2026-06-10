import { useCallback, useMemo } from "react"
import { runPickerWindowCaptureChain } from "../side-picker/interaction/picker-list-kernel"
import { verticalNavDirection } from "../side-picker/interaction/picker-vertical-nav"
import { useWindowKeydownCapture } from "../side-picker/hooks/use-window-keydown-capture"
import type { SettingListPickerState } from "./setting-list-picker-state"
import { settingPickerGoToView } from "./setting-list-picker-state"
import {
  isArrowLeft,
  isArrowRight,
  isSettingDetailView,
  isSettingListSubView,
  settingMainRowTargetView
} from "./setting-picker-nav"
import type { SettingPickerRow } from "./setting-picker-rows"
import { settingPickerAllowsVerticalNav, settingPickerInitialHi } from "./setting-picker-rows"
import {
  settingEditFieldForView,
  validateSettingEditValue,
  type SettingEditField
} from "./setting-picker-edit"

export type SettingPickerKeyboardCallbacks = {
  onImmediateMainAction: (row: SettingPickerRow) => void | Promise<void>
  onApplyListChoice: (row: SettingPickerRow, index: number) => void | Promise<void>
  onApplyEdit: (field: SettingEditField, value: string) => void | Promise<void>
  onEditInvalid: () => void
  onReturnToPrompt?: () => void
  resolveEditSeed: () => string
}

export type UseSettingPickerKeyboardOptions = {
  state: SettingListPickerState
  onStateChange: (next: SettingListPickerState) => void
  rows: readonly SettingPickerRow[]
  hi: number
  setHi: (next: number | ((prev: number) => number)) => void
  keyboardActive: boolean
  sessionId?: string
  callbacks: SettingPickerKeyboardCallbacks
}

export function useSettingPickerKeyboard({
  state,
  onStateChange,
  rows,
  hi,
  setHi,
  keyboardActive,
  sessionId,
  callbacks
}: UseSettingPickerKeyboardOptions): {
  onWindowKeydownCapture: (ev: KeyboardEvent) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
} {
  const goMain = useCallback(() => {
    onStateChange(settingPickerGoToView("main", state))
    setHi(0)
  }, [onStateChange, setHi, state])

  const startEditing = useCallback(
    (draft: string) => {
      onStateChange({ ...state, editing: true, editDraft: draft })
    },
    [onStateChange, state]
  )

  const cancelEditing = useCallback(() => {
    onStateChange({ ...state, editing: false, editDraft: "" })
  }, [onStateChange, state])

  const runVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!keyboardActive || e.ctrlKey || e.metaKey || e.altKey) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || state.editing) {
        return false
      }
      if (!settingPickerAllowsVerticalNav(state.view)) {
        return false
      }
      const dir = verticalNavDirection(e)
      if (dir === "down") {
        e.preventDefault()
        e.stopPropagation()
        setHi((h) => Math.min(h + 1, Math.max(0, rows.length - 1)))
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
    [keyboardActive, rows.length, setHi, state.editing, state.view]
  )

  const handleArrowRight = useCallback(async (): Promise<void> => {
    const row = rows[hi]
    if (!row) {
      return
    }
    if (state.view === "main") {
      const target = settingMainRowTargetView(row.id)
      if (target === null) {
        await callbacks.onImmediateMainAction(row)
        return
      }
      onStateChange(settingPickerGoToView(target, state))
      setHi(
        settingPickerInitialHi(target, state.draft.locale, state.draft.appearance)
      )
      return
    }
    if (state.editing) {
      return
    }
    if (isSettingListSubView(state.view)) {
      await callbacks.onApplyListChoice(row, hi)
      return
    }
    if (isSettingDetailView(state.view)) {
      startEditing(callbacks.resolveEditSeed())
    }
  }, [
    callbacks,
    goMain,
    hi,
    onStateChange,
    rows,
    setHi,
    startEditing,
    state.editing,
    state.view
  ])

  const handleArrowLeft = useCallback((): void => {
    if (state.editing) {
      cancelEditing()
      return
    }
    if (state.view !== "main") {
      goMain()
    }
  }, [cancelEditing, goMain, state.editing, state.view])

  const commitEdit = useCallback(async (): Promise<boolean> => {
    if (!state.editing) {
      return false
    }
    const view = state.view
    if (view !== "fg" && view !== "bgColor" && view !== "font") {
      return false
    }
    const field = settingEditFieldForView(view)
    const value = validateSettingEditValue(field, state.editDraft)
    if (!value) {
      callbacks.onEditInvalid()
      return true
    }
    await callbacks.onApplyEdit(field, value)
    return true
  }, [callbacks, state.editDraft, state.editing, state.view])

  const applyListChoice = useCallback(async (): Promise<void> => {
    const row = rows[hi]
    if (!row || !isSettingListSubView(state.view) || state.editing) {
      return
    }
    await callbacks.onApplyListChoice(row, hi)
  }, [callbacks, hi, rows, state.editing, state.view])

  const handleEnter = useCallback(async (): Promise<void> => {
    if (state.editing) {
      await commitEdit()
      return
    }
    if (isSettingListSubView(state.view)) {
      await applyListChoice()
      return
    }
    if (isSettingDetailView(state.view)) {
      startEditing(callbacks.resolveEditSeed())
      return
    }
    if (state.view === "main") {
      await handleArrowRight()
    }
  }, [
    applyListChoice,
    callbacks,
    commitEdit,
    handleArrowRight,
    startEditing,
    state.editing,
    state.view
  ])

  const onWindowKeydownCapture = useCallback(
    (ev: KeyboardEvent) => {
      if (!keyboardActive) {
        return
      }
      if (
        state.editing &&
        ev.key.length === 1 &&
        !ev.ctrlKey &&
        !ev.metaKey &&
        !ev.altKey
      ) {
        return
      }
      if (isArrowRight(ev)) {
        ev.preventDefault()
        ev.stopPropagation()
        void handleArrowRight()
        return
      }
      if (isArrowLeft(ev)) {
        ev.preventDefault()
        ev.stopPropagation()
        handleArrowLeft()
        return
      }
      if (
        runPickerWindowCaptureChain(ev, sessionId ?? "", {
          paneStrip: Boolean(sessionId),
          verticalNav: runVerticalNav
        })
      ) {
        return
      }
      if (ev.key === "Enter" && !ev.shiftKey && !(ev as KeyboardEvent & { isComposing?: boolean }).isComposing) {
        ev.preventDefault()
        ev.stopPropagation()
        void handleEnter()
        return
      }
      if (ev.key === "Escape") {
        if (state.editing) {
          ev.preventDefault()
          ev.stopPropagation()
          cancelEditing()
          return
        }
        if (state.view !== "main") {
          ev.preventDefault()
          ev.stopPropagation()
          goMain()
          return
        }
        ev.preventDefault()
        ev.stopPropagation()
        callbacks.onReturnToPrompt?.()
      }
    },
    [
      cancelEditing,
      callbacks,
      goMain,
      handleArrowLeft,
      handleArrowRight,
      handleEnter,
      keyboardActive,
      runVerticalNav,
      sessionId,
      state.editing,
      state.view
    ]
  )

  useWindowKeydownCapture(onWindowKeydownCapture)

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive || e.nativeEvent.isComposing) {
        return
      }
      const native = e.nativeEvent
      if (isArrowRight(native) || isArrowLeft(native)) {
        e.preventDefault()
        return
      }
      if (runVerticalNav(native)) {
        e.preventDefault()
        return
      }
      if (native.key === "Enter" && !native.shiftKey && !native.isComposing) {
        e.preventDefault()
        void handleEnter()
        return
      }
      if (native.key === "Escape") {
        e.preventDefault()
        if (state.editing) {
          cancelEditing()
          return
        }
        if (state.view !== "main") {
          goMain()
          return
        }
        callbacks.onReturnToPrompt?.()
      }
    },
    [
      callbacks,
      cancelEditing,
      goMain,
      handleEnter,
      keyboardActive,
      runVerticalNav,
      state.editing,
      state.view
    ]
  )

  return useMemo(
    () => ({ onWindowKeydownCapture, onInputKeyDown }),
    [onInputKeyDown, onWindowKeydownCapture]
  )
}
