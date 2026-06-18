/** EN: `session -list` — floating candidate menu (same chrome as token / subcommand pickers). */

import { useLayoutEffect, useRef } from "react"
import { useUiCopy } from "../setting"
import { formatSessionListCandidateLabel, type SessionListRow } from "./session-summary"

const ITEM_ID_PREFIX = "bmxt-session-candidate-item"

type Props = {
  rows: SessionListRow[]
  hi: number
}

export function SessionListCandidatePanel({ rows, hi }: Props) {
  const uiCopy = useUiCopy()
  const listRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || rows.length === 0) {
      return
    }
    const clamped = Math.min(Math.max(0, hi), rows.length - 1)
    list.querySelector<HTMLElement>(`#${ITEM_ID_PREFIX}-${clamped}`)?.scrollIntoView({ block: "nearest" })
  }, [hi, rows.length])

  return (
    <div className="bmxt-subcmd-picker" role="listbox" aria-label={uiCopy.t("session.picker.aria")}>
      <div className="bmxt-subcmd-picker-hint">{uiCopy.t("session.picker.hint")}</div>
      <div ref={listRef} className="bmxt-subcmd-picker-list">
        {rows.map((row, i) => (
          <div
            key={row.sessionId}
            id={`${ITEM_ID_PREFIX}-${i}`}
            role="option"
            aria-selected={i === hi}
            className={`bmxt-subcmd-picker-item${i === hi ? " bmxt-subcmd-picker-item--hi" : ""}${
              row.isActive ? " bmxt-subcmd-picker-item--active-session" : ""
            }`}>
            {formatSessionListCandidateLabel(row)}
          </div>
        ))}
      </div>
    </div>
  )
}
