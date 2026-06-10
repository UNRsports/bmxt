/** 第一コマンドのみ確定後に出す第二コマンド候補（IME 風リスト）。 */

import { SECOND_COMMAND_PICKER_ARIA, SECOND_COMMAND_PICKER_HINT } from "../setting/ui-copy"
import { useUiCopy } from "../setting"

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
  const uiCopy = useUiCopy()
  return (
    <div
      className="bmxt-subcmd-picker"
      role="listbox"
      aria-label={uiCopy.t(SECOND_COMMAND_PICKER_ARIA)}>
      <div className="bmxt-subcmd-picker-hint">{uiCopy.t(SECOND_COMMAND_PICKER_HINT)}</div>
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
