import { useId } from "react"
import {
  CSP_DYNAMIC_SCOPE_ATTR,
  useCspDynamicStyle
} from "../bmxt-window/csp-dynamic-stylesheet"
import { appearanceToCssDeclarations } from "./apply-appearance"
import type { UiAppearance } from "./appearance"
import { t } from "./i18n/messages"
import type { UiLocale } from "./locale"

export type SettingPickerPreviewProps = {
  appearance: UiAppearance
  locale: UiLocale
}

export function SettingPickerPreview({ appearance, locale }: SettingPickerPreviewProps) {
  const scopeId = useId()
  const decl = appearanceToCssDeclarations(appearance)
  useCspDynamicStyle(scopeId, {
    ...decl,
    backgroundColor: "var(--bmxt-bg)",
    backgroundImage: "var(--bmxt-bg-image)",
    backgroundSize: "var(--bmxt-bg-size)",
    backgroundPosition: "var(--bmxt-bg-position)",
    backgroundRepeat: "var(--bmxt-bg-repeat)",
    borderRadius: "4px",
    padding: "8px 10px",
    minHeight: "4.5em",
    overflow: "hidden"
  })

  return (
    <div className="bmxt-setting-picker-preview">
      <div className="bmxt-setting-picker-preview-head">
        {t("setting.picker.preview.head", locale)}
      </div>
      <div
        className="bmxt-setting-picker-preview-body"
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
