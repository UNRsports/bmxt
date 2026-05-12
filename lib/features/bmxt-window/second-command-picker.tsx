/** 第一コマンドのみ確定後に出す第二コマンド候補（IME 風リスト）。 */

export type SubCommandPickerModel = {
  /** 例: `tabs ` / `split `（末尾スペース付き continuation） */
  continuation: string
  candidates: string[]
  hi: number
}

type Props = {
  model: SubCommandPickerModel
  onHighlight: (hi: number) => void
  onPickIndex: (hi: number) => void
}

export function SecondCommandPickerPanel({ model, onHighlight, onPickIndex }: Props) {
  return (
    <div
      className="bmxt-subcmd-picker"
      role="listbox"
      aria-label="Second command / 第二コマンド">
      <div className="bmxt-subcmd-picker-hint">
        Second command · ↑↓ / Tab · Enter · Esc — 第二コマンド
      </div>
      {model.candidates.map((c, i) => (
        <div
          key={c}
          role="option"
          aria-selected={i === model.hi}
          className={`bmxt-subcmd-picker-item${i === model.hi ? " bmxt-subcmd-picker-item--hi" : ""}`}
          onMouseEnter={() => onHighlight(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPickIndex(i)}>
          {c}
        </div>
      ))}
    </div>
  )
}
