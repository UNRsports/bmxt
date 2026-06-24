/** 第一コマンドのみ確定後に出す第二コマンド候補（IME 風リスト）。 */

import { tSecondCommandPicker } from "../setting/i18n/ns/second-command-picker"
import { useUiSettings } from "../setting/use-ui-settings"

export type SubCommandPickerModel = {
  /** 例: `tabs ` / `split `（末尾スペース付き continuation） */
  continuation: string
  candidates: string[]
  hi: number
}

type Props = {
  model: SubCommandPickerModel
}

export function SecondCommandPickerPanel({ model }: Props) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  return (
    <div
      className="bmxt-subcmd-picker"
      role="listbox"
      aria-label={tSecondCommandPicker("secondCommandPicker.aria", locale)}>
      <div className="bmxt-subcmd-picker-hint">{tSecondCommandPicker("secondCommandPicker.hint", locale)}</div>
      {model.candidates.map((c, i) => (
        <div
          key={c}
          role="option"
          aria-selected={i === model.hi}
          className={`bmxt-subcmd-picker-item${i === model.hi ? " bmxt-subcmd-picker-item--hi" : ""}`}>
          {c}
        </div>
      ))}
    </div>
  )
}
