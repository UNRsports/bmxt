import { useCallback, useMemo, type MutableRefObject } from "react"
import { PlainTextPickerBody } from "../side-picker/plain/plain-text-picker-body"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { useUiLocale } from "./use-ui-settings"
import {
  buildSettingPickerRows,
  fontSizeFromPickerIndex,
  settingPickerHeadline,
  type SettingPickerRow,
  type SettingPickerRowId
} from "./setting-picker-rows"
import type { SettingListPickerState, SettingListPickerView } from "./setting-list-picker-state"
import type { UiAppearance } from "./appearance"

export type SettingPickerWrapperProps = {
  state: SettingListPickerState
  appearance: UiAppearance
  onStateChange: (next: SettingListPickerState) => void
  onRowAction: (row: SettingPickerRow, index: number) => void | Promise<void>
  onReturnToPrompt: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function SettingPickerWrapper({
  state,
  appearance,
  onStateChange,
  onRowAction,
  onReturnToPrompt,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: SettingPickerWrapperProps) {
  const locale = useUiLocale()
  const rows = useMemo(
    () => buildSettingPickerRows(state.view, locale, appearance),
    [state.view, locale, appearance]
  )
  const lines = useMemo(() => rows.map((row) => row.line), [rows])
  const headline = settingPickerHeadline(state.view, locale)

  const navigateToView = useCallback(
    (view: SettingListPickerView) => {
      onStateChange({ view })
    },
    [onStateChange]
  )

  const handleMainRow = useCallback(
    async (row: SettingPickerRow) => {
      const id: SettingPickerRowId = row.id
      if (id === "language") {
        navigateToView("language")
        return
      }
      if (id === "size") {
        navigateToView("fontSize")
        return
      }
      if (id === "bg-image") {
        navigateToView("bgImage")
        return
      }
      if (id === "back") {
        navigateToView("main")
        return
      }
      await onRowAction(row, -1)
    },
    [navigateToView, onRowAction]
  )

  const onConfirmLineIndex = useCallback(
    async (index: number) => {
      const row = rows[index]
      if (!row) {
        return
      }
      if (state.view === "language") {
        if (row.id === "locale-ja" || row.id === "locale-en") {
          await onRowAction(row, index)
          navigateToView("main")
        }
        return
      }
      if (state.view === "fontSize") {
        const size = fontSizeFromPickerIndex(index)
        if (size) {
          await onRowAction({ id: "size", line: size }, index)
          navigateToView("main")
        }
        return
      }
      if (state.view === "bgImage") {
        if (row.id === "back") {
          navigateToView("main")
          return
        }
        await onRowAction(row, index)
        if (row.id === "bg-import" || row.id === "bg-clear") {
          navigateToView("main")
        }
        return
      }
      await handleMainRow(row)
    },
    [handleMainRow, navigateToView, onRowAction, rows, state.view]
  )

  const extensions = useMemo((): PlainPickerKeyboardExtensions => {
    if (state.view === "main") {
      return {}
    }
    return {
      onEsc: () => {
        navigateToView("main")
        return true
      }
    }
  }, [navigateToView, state.view])

  return (
    <PlainTextPickerBody
      headline={headline}
      lines={lines}
      onReturnToPrompt={onReturnToPrompt}
      onConfirmLineIndex={(index) => {
        void onConfirmLineIndex(index)
      }}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      extensions={extensions}
    />
  )
}
