/** EN: IME-style dropdown for command-line fixed tokens (any tier). */

import { useLayoutEffect, useRef } from "react"
import type { ImeTokenTier } from "../command-line/ime-token-picker"
import { imeTokenPickerHint } from "../command-line/ime-token-picker"
import { isPipeProducerFirstCommand } from "../command-line/pipe/pipe-producer-first.ts"
import { tImeToken } from "../setting/i18n/ns/ime-token"
import { useUiSettings } from "../setting/use-ui-settings"

const ITEM_ID_PREFIX = "bmxt-subcmd-item"

/** EN: Structured row for live candidates (e.g. `reload` tabs). */
export type TokenPickerCandidateRow = {
  title: string
  /** EN: Optional secondary line (omitted for nav reload tab rows). */
  detail?: string
  faviconSrc: string | null
}

export type TokenPickerModel = {
  tokenStart: number
  tokenEnd: number
  candidates: string[]
  /** EN: Optional flat display labels parallel to `candidates` (legacy / simple tokens). */
  candidateLabels?: string[]
  /** EN: Optional structured rows (title wraps; detail on its own line). */
  candidateRows?: TokenPickerCandidateRow[]
  hi: number
  tier: ImeTokenTier
  /** EN: Stage already has a pipe-producer first command (second/third tier). */
  pipeAvailable?: boolean
}

type Props = {
  model: TokenPickerModel
  /**
   * EN: When set (mobile host UI only), pointer/tap selects a candidate (same as Enter on that row).
   *     Desktop omits this prop; keyboard navigation only.
   *     `mousedown` preventDefault keeps the prompt IME focused.
   */
  onPickIndex?: (index: number) => void
}

function pointerHintKey(
  tier: ImeTokenTier
): "imeToken.hint.firstPointer" | "imeToken.hint.secondPointer" | "imeToken.hint.thirdPointer" {
  if (tier === "first") {
    return "imeToken.hint.firstPointer"
  }
  if (tier === "second") {
    return "imeToken.hint.secondPointer"
  }
  return "imeToken.hint.thirdPointer"
}

export function TokenPickerPanel({ model, onPickIndex }: Props) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const listRef = useRef<HTMLDivElement>(null)
  const pointerSelect = typeof onPickIndex === "function"
  const hint = pointerSelect
    ? tImeToken(pointerHintKey(model.tier), locale)
    : imeTokenPickerHint(model.tier, locale)
  const hi = Math.min(Math.max(0, model.hi), Math.max(0, model.candidates.length - 1))
  const pipeAvailable =
    model.tier === "first"
      ? isPipeProducerFirstCommand(model.candidates[hi] ?? "")
      : model.pipeAvailable === true
  const useRows =
    Array.isArray(model.candidateRows) &&
    model.candidateRows.length === model.candidates.length

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || model.candidates.length === 0) {
      return
    }
    list.querySelector<HTMLElement>(`#${ITEM_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [hi, model.candidates.length])

  return (
    <div className="bmxt-subcmd-picker" role="listbox" aria-label={hint}>
      <div className="bmxt-subcmd-picker-hint">
        <span>{hint}</span>
        {pipeAvailable ? (
          <span className="bmxt-subcmd-picker-hint-pipe">
            {tImeToken("imeToken.hint.pipeAvailable", locale)}
          </span>
        ) : null}
      </div>
      <div ref={listRef} className="bmxt-subcmd-picker-list">
        {model.candidates.map((c, i) => {
          const row = useRows ? model.candidateRows![i] : null
          return (
            <div
              key={`${c}-${i}`}
              id={`${ITEM_ID_PREFIX}-${i}`}
              role="option"
              aria-selected={i === model.hi}
              className={`bmxt-subcmd-picker-item${useRows ? " bmxt-subcmd-picker-item--row" : ""}${i === model.hi ? " bmxt-subcmd-picker-item--hi" : ""}${pointerSelect ? " bmxt-subcmd-picker-item--pickable" : ""}`}
              onMouseDown={
                pointerSelect
                  ? (e) => {
                      e.preventDefault()
                    }
                  : undefined
              }
              onClick={
                pointerSelect
                  ? () => {
                      onPickIndex(i)
                    }
                  : undefined
              }>
              {row ? (
                <>
                  {row.faviconSrc ? (
                    <img
                      className="bmxt-subcmd-picker-item-favicon"
                      src={row.faviconSrc}
                      alt=""
                      width={16}
                      height={16}
                      decoding="async"
                      draggable={false}
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden"
                      }}
                    />
                  ) : (
                    <span className="bmxt-subcmd-picker-item-favicon-spacer" aria-hidden />
                  )}
                  <span className="bmxt-subcmd-picker-item-body">
                    <span className="bmxt-subcmd-picker-item-title">{row.title}</span>
                    {row.detail ? (
                      <span className="bmxt-subcmd-picker-item-detail">{row.detail}</span>
                    ) : null}
                  </span>
                </>
              ) : (
                (model.candidateLabels?.[i] ?? c)
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
