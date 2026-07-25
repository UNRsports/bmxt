/** EN: IME-style dropdown for command-line fixed tokens (any tier). */

import { useLayoutEffect, useRef } from "react"
import type { ImeTokenTier } from "../command-line/ime-token-picker"
import { imeTokenPickerHint } from "../command-line/ime-token-picker"
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
}

type Props = {
  model: TokenPickerModel
}

export function TokenPickerPanel({ model }: Props) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const listRef = useRef<HTMLDivElement>(null)
  const hint = imeTokenPickerHint(model.tier, locale)
  const useRows =
    Array.isArray(model.candidateRows) &&
    model.candidateRows.length === model.candidates.length

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
        {model.candidates.map((c, i) => {
          const row = useRows ? model.candidateRows![i] : null
          return (
            <div
              key={`${c}-${i}`}
              id={`${ITEM_ID_PREFIX}-${i}`}
              role="option"
              aria-selected={i === model.hi}
              className={`bmxt-subcmd-picker-item${useRows ? " bmxt-subcmd-picker-item--row" : ""}${i === model.hi ? " bmxt-subcmd-picker-item--hi" : ""}`}>
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
