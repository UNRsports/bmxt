/** EN: IME-style dropdown for command-line fixed tokens (any tier). */

import { useLayoutEffect, useRef } from "react"
import type { ImeTokenTier } from "../command-line/ime-token-picker"
import { imeTokenPickerHint } from "../command-line/ime-token-picker"
import { useUiCopy } from "../setting"

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
}

export function TokenPickerPanel({ model }: Props) {
  const uiCopy = useUiCopy()
  const listRef = useRef<HTMLDivElement>(null)
  const hint = imeTokenPickerHint(model.tier, uiCopy.locale)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || model.candidates.length === 0) {
      return
    }
    const hi = Math.min(Math.max(0, model.hi), model.candidates.length - 1)
    list.querySelector<HTMLElement>(`#${ITEM_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [model.hi, model.candidates.length])

  return (
    <div className="bmxt-subcmd-picker" role="listbox" aria-label={hint}>
      <div className="bmxt-subcmd-picker-hint">{hint}</div>
      <div ref={listRef} className="bmxt-subcmd-picker-list">
        {model.candidates.map((c, i) => (
          <div
            key={`${c}-${i}`}
            id={`${ITEM_ID_PREFIX}-${i}`}
            role="option"
            aria-selected={i === model.hi}
            className={`bmxt-subcmd-picker-item${i === model.hi ? " bmxt-subcmd-picker-item--hi" : ""}`}>
            {c}
          </div>
        ))}
      </div>
    </div>
  )
}
