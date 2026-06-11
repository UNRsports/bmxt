import { useCallback, useMemo, type MutableRefObject } from "react"
import {
  resolvePickerAppearance,
  resolveTerminalAppearance
} from "./appearance"
import { SettingPickerBody } from "./setting-picker-body"
import {
  appearanceLayerForEdit,
  settingEditLayerForView,
  type SettingEditField
} from "./setting-picker-edit"
import {
  buildSettingPickerRows,
  settingPickerHeadline,
  type SettingPickerRow
} from "./setting-picker-rows"
import { isSettingDetailView } from "./setting-picker-nav"
import type { SettingListPickerState } from "./setting-list-picker-state"
import { SettingPickerPreview } from "./setting-picker-preview"
import { resolveSettingPickerPreviewAppearance } from "./setting-picker-edit"

export type SettingPickerWrapperProps = {
  state: SettingListPickerState
  onStateChange: (next: SettingListPickerState) => void
  onRowAction: (row: SettingPickerRow, index: number) => void | Promise<void>
  onApplyEdit: (field: SettingEditField, value: string) => void | Promise<void>
  onEditInvalid: () => void | Promise<void>
  onReturnToPrompt: () => void
  onExitToDetailBar?: () => void
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
  onExitToDetailBar,
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
    if (!isSettingDetailView(state.view)) {
      return ""
    }
    const layer = settingEditLayerForView(state.view)
    const layerValues = appearanceLayerForEdit(appearance, layer)
    const resolved =
      layer === "picker" ? resolvePickerAppearance(appearance) : resolveTerminalAppearance(appearance)
    if (state.view === "fg" || state.view === "fgPicker") {
      return layerValues.fg ?? resolved.fg
    }
    if (state.view === "bgColor" || state.view === "bgColorPicker") {
      return layerValues.bgColor ?? resolved.bgColor
    }
    if (state.view === "font" || state.view === "fontPicker") {
      return layerValues.fontFamily ?? resolved.fontFamily
    }
    return ""
  }, [appearance, state.view])

  const keyboardCallbacks = useMemo(
    () => ({
      onImmediateMainAction: (row: SettingPickerRow) => onRowAction(row, -1),
      onApplyListChoice: onRowAction,
      onApplyEdit,
      onEditInvalid,
      onReturnToPrompt,
      onExitToDetailBar,
      resolveEditSeed
    }),
    [onApplyEdit, onEditInvalid, onExitToDetailBar, onReturnToPrompt, onRowAction, resolveEditSeed]
  )

  const preview = useMemo(
    () => <SettingPickerPreview appearance={previewAppearance} locale={locale} />,
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
