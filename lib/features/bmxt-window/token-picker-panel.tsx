/** EN: IME-style dropdown for command-line fixed tokens (any tier). */
/** JA: コマンドライン固定トークン用 IME 風プルダウン（第一〜第三）。 */

import { useLayoutEffect, useRef } from "react"
import type { ImeTokenTier } from "../command-line/ime-token-picker"
import { imeTokenPickerHint } from "../command-line/ime-token-picker"

const ITEM_ID_PREFIX = "bmxt-subcmd-item"

export type TokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  candidates: string[]
  hi: number
  tier: ImeTokenTier
}

type Props = {
  model: TokenPickerModel
  onHighlight: (hi: number) => void
  onPickIndex: (hi: number) => void
}

export function TokenPickerPanel({ model, onHighlight, onPickIndex }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || model.candidates.length === 0) {
      return
    }
    const hi = Math.min(Math.max(0, model.hi), model.candidates.length - 1)
    list.querySelector<HTMLElement>(`#${ITEM_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [model.hi, model.candidates.length])

  return (
    <div
      className="bmxt-subcmd-picker"
      role="listbox"
      aria-label={imeTokenPickerHint(model.tier)}>
      <div className="bmxt-subcmd-picker-hint">{imeTokenPickerHint(model.tier)}</div>
      <div ref={listRef} className="bmxt-subcmd-picker-list">
        {model.candidates.map((c, i) => (
          <div
            key={`${c}-${i}`}
            id={`${ITEM_ID_PREFIX}-${i}`}
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
    </div>
  )
}
