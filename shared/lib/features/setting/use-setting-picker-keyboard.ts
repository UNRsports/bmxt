import { useCallback, useMemo } from "react"
import { runPickerWindowCaptureChain } from "../side-picker/interaction/picker-list-kernel"
import {
  pickerArrowLeft,
  pickerArrowRight,
  pickerEnterKey,
  pickerPlainTypingKey,
  pickerStopEvent
} from "../side-picker/interaction/picker-key-event"
import { verticalNavDirection } from "../side-picker/interaction/picker-vertical-nav"
import { useWindowKeydownCapture } from "../side-picker/hooks/use-window-keydown-capture"
import type { UiSettingsStorageConfig } from "./settings-storage-config"
import type { SnapshotStorageConfig } from "../snapshot/snapshot-storage-config"
import type { SyncPickerSummary } from "../sync/facade/sync-picker-summary.ts"
import { settingPickerGoToView, type SettingListPickerState } from "./setting-list-picker-state"
import {
  isSettingDetailView,
  isSettingListSubView,
  settingMainRowTargetView,
  settingSyncBackView
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
  onExitToDetailBar?: () => void
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
  storageConfig?: UiSettingsStorageConfig
  snapshotStorageConfig?: SnapshotStorageConfig
  syncSummary?: SyncPickerSummary
}

export function useSettingPickerKeyboard({
  state,
  onStateChange,
  rows,
  hi,
  setHi,
  keyboardActive,
  sessionId,
  callbacks,
  storageConfig,
  snapshotStorageConfig,
  syncSummary
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
        settingPickerInitialHi(
          target,
          state.draft.locale,
          state.draft.appearance,
          storageConfig,
          snapshotStorageConfig,
          state.draft.hostUiMode,
          state.draft.imeCandidateHelp,
          state.draft.promptFire,
          state.draft.searchLegendMode,
          syncSummary
        )
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
    hi,
    onStateChange,
    rows,
    setHi,
    startEditing,
    state.editing,
    state.view,
    state.draft.appearance,
    state.draft.locale,
    state.draft.hostUiMode,
    state.draft.imeCandidateHelp,
    state.draft.promptFire,
    state.draft.searchLegendMode,
    storageConfig,
    snapshotStorageConfig,
    syncSummary
  ])

  const leaveNonMainView = useCallback((): void => {
    const syncBack = settingSyncBackView(state.view)
    if (syncBack !== null) {
      onStateChange(settingPickerGoToView(syncBack, state))
      setHi(0)
      return
    }
    goMain()
  }, [goMain, onStateChange, setHi, state])

  /**
   * EN: ← = step back only (cancel edit / leave sub-view). Root-list exit uses
   *     shared `exitToDetailBar` (never exit on →).
   */
  const handleArrowLeftBack = useCallback((): boolean => {
    if (state.editing) {
      cancelEditing()
      return true
    }
    if (state.view !== "main") {
      leaveNonMainView()
      return true
    }
    return false
  }, [cancelEditing, leaveNonMainView, state.editing, state.view])

  const commitEdit = useCallback(async (): Promise<boolean> => {
    if (!state.editing) {
      return false
    }
    if (!isSettingDetailView(state.view)) {
      return false
    }
    const field = settingEditFieldForView(state.view)
    const value = validateSettingEditValue(field, state.editDraft)
    if (!value) {
      callbacks.onEditInvalid()
      return true
    }
    await callbacks.onApplyEdit(field, value)
    if (state.view === "syncDeviceName") {
      onStateChange(settingPickerGoToView("syncPanel", { ...state, editing: false, editDraft: "" }))
      setHi(0)
    }
    return true
  }, [callbacks, onStateChange, setHi, state])

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
      if (state.editing && pickerPlainTypingKey(ev)) {
        return
      }
      // EN: → = drill forward / apply (never exit the column).
      if (pickerArrowRight(ev)) {
        pickerStopEvent(ev)
        if (!state.editing) {
          void handleArrowRight()
        }
        return
      }
      // EN: ← = cancel edit / leave sub-view; root list falls through to shared exit.
      if (pickerArrowLeft(ev) && handleArrowLeftBack()) {
        pickerStopEvent(ev)
        return
      }
      if (
        runPickerWindowCaptureChain(ev, sessionId ?? "", {
          exitToDetailBar:
            callbacks.onExitToDetailBar && state.view === "main" && !state.editing
              ? {
                  canExit: () => state.view === "main" && !state.editing,
                  onExit: callbacks.onExitToDetailBar
                }
              : undefined,
          verticalNav: runVerticalNav
        })
      ) {
        return
      }
      if (pickerEnterKey(ev)) {
        pickerStopEvent(ev)
        void handleEnter()
        return
      }
      if (ev.key === "Escape") {
        if (state.editing) {
          pickerStopEvent(ev)
          cancelEditing()
          return
        }
        if (state.view !== "main") {
          pickerStopEvent(ev)
          leaveNonMainView()
          return
        }
        pickerStopEvent(ev)
        callbacks.onReturnToPrompt?.()
      }
    },
    [
      cancelEditing,
      callbacks,
      handleArrowLeftBack,
      handleArrowRight,
      handleEnter,
      keyboardActive,
      leaveNonMainView,
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
      if (pickerArrowRight(native) || pickerArrowLeft(native)) {
        e.preventDefault()
        return
      }
      if (runVerticalNav(native)) {
        e.preventDefault()
        return
      }
      if (pickerEnterKey(native)) {
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
          leaveNonMainView()
          return
        }
        callbacks.onReturnToPrompt?.()
      }
    },
    [
      callbacks,
      cancelEditing,
      handleEnter,
      keyboardActive,
      leaveNonMainView,
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
