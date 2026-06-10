import { useId } from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../bmxt-window/csp-dynamic-stylesheet"
import { resolvedAppearanceToScopedDeclarations } from "./apply-appearance"
import {
  resolvePickerAppearance,
  resolveTerminalAppearance,
  type ResolvedTerminalAppearance,
  type UiAppearance
} from "./appearance"
import { t } from "./i18n/messages"
import type { UiLocale } from "./locale"

export type SettingPickerPreviewProps = {
  appearance: UiAppearance
  locale: UiLocale
}

function PreviewPane({
  label,
  locale,
  resolved
}: {
  label: string
  locale: UiLocale
  resolved: ResolvedTerminalAppearance
}) {
  const scopeId = useId()
  useCspDynamicStyle(scopeId, {
    ...resolvedAppearanceToScopedDeclarations(resolved),
    borderRadius: "4px",
    padding: "8px 10px",
    minHeight: "3.5em",
    overflow: "hidden",
    flex: "1 1 0",
    minWidth: 0
  })

  return (
    <div className="bmxt-setting-picker-preview-pane">
      <div className="bmxt-setting-picker-preview-pane-head">{label}</div>
      <div
        className="bmxt-setting-picker-preview-pane-body"
        {...{ [CSP_DYNAMIC_SCOPE_ATTR]: scopeId }}>
        <div className="bmxt-setting-picker-preview-prompt">
          {t("setting.picker.preview.prompt", locale)}
        </div>
        <div className="bmxt-setting-picker-preview-line">
          {t("setting.picker.preview.sample", locale)}
        </div>
      </div>
    </div>
  )
}

export function SettingPickerPreview({ appearance, locale }: SettingPickerPreviewProps) {
  const terminalResolved = resolveTerminalAppearance(appearance)
  const pickerResolved = resolvePickerAppearance(appearance)
  const showSplit = appearance.editPicker

  return (
    <div className="bmxt-setting-picker-preview">
      <div className="bmxt-setting-picker-preview-head">
        {t("setting.picker.preview.head", locale)}
      </div>
      <div
        className={`bmxt-setting-picker-preview-panes${
          showSplit ? " bmxt-setting-picker-preview-panes--split" : ""
        }`}>
        <PreviewPane
          label={t("setting.picker.preview.terminal", locale)}
          locale={locale}
          resolved={terminalResolved}
        />
        {showSplit ? (
          <PreviewPane
            label={t("setting.picker.preview.pickerColumn", locale)}
            locale={locale}
            resolved={pickerResolved}
          />
        ) : null}
      </div>
    </div>
  )
}
