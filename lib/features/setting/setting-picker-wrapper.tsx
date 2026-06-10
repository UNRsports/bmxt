import { useCallback, useMemo, type MutableRefObject } from "react"
import { resolveTerminalAppearance } from "./appearance"
import { SettingPickerBody } from "./setting-picker-body"
import {
  buildSettingPickerRows,
  settingPickerHeadline,
  type SettingPickerRow
} from "./setting-picker-rows"
import {
  resolveSettingPickerPreviewAppearance,
  type SettingEditField
} from "./setting-picker-edit"
import type { SettingListPickerState } from "./setting-list-picker-state"
import { SettingPickerPreview } from "./setting-picker-preview"

export type SettingPickerWrapperProps = {
  state: SettingListPickerState
  onStateChange: (next: SettingListPickerState) => void
  onRowAction: (row: SettingPickerRow, index: number) => void | Promise<void>
  onApplyEdit: (field: SettingEditField, value: string) => void | Promise<void>
  onEditInvalid: () => void | Promise<void>
  onReturnToPrompt: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
  sessionId?: string
}

export function SettingPickerWrapper({
  state,
  onStateChange,
  onRowAction,
  onApplyEdit,
  onEditInvalid,
  onReturnToPrompt,
  keyboardActive = false,
  pickerInputRef,
  sessionId
}: SettingPickerWrapperProps) {
  const { draft } = state
  const locale = draft.locale
  const appearance = draft.appearance
  const previewAppearance = useMemo(
    () => resolveSettingPickerPreviewAppearance(state),
    [state]
  )
  const rows = useMemo(
    () => buildSettingPickerRows(state.view, locale, appearance),
    [state.view, locale, appearance]
  )
  const lines = useMemo(() => rows.map((row) => row.line), [rows])
  const headline = settingPickerHeadline(state.view, locale, state.editing)

  const resolveEditSeed = useCallback((): string => {
    const resolved = resolveTerminalAppearance(appearance)
    if (state.view === "fg") {
      return appearance.fg ?? resolved.fg
    }
    if (state.view === "bgColor") {
      return appearance.bgColor ?? resolved.bgColor
    }
    if (state.view === "font") {
      return appearance.fontFamily ?? resolved.fontFamily
    }
    return ""
  }, [appearance, state.view])

  const keyboardCallbacks = useMemo(
    () => ({
      onImmediateMainAction: (row: SettingPickerRow) => onRowAction(row, -1),
      onApplyListChoice: onRowAction,
      onApplyEdit,
      onEditInvalid,
      resolveEditSeed
    }),
    [onApplyEdit, onEditInvalid, onRowAction, resolveEditSeed]
  )

  const preview = useMemo(
    () => (
      <SettingPickerPreview appearance={previewAppearance} locale={locale} />
    ),
    [previewAppearance, locale]
  )

  return (
    <SettingPickerBody
      headline={headline}
      lines={lines}
      rows={rows}
      state={state}
      locale={locale}
      onStateChange={onStateChange}
      keyboardCallbacks={keyboardCallbacks}
      onReturnToPrompt={onReturnToPrompt}
      keyboardActive={keyboardActive}
      pickerInputRef={pickerInputRef}
      sessionId={sessionId}
      preview={preview}
    />
  )
}
