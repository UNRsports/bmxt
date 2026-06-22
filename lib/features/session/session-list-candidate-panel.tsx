/** EN: `session -list` / `session -switch` — floating candidate menu (subcommand picker chrome). */

import { useLayoutEffect, useRef } from "react"
import { useUiCopy } from "../setting/use-ui-copy"
import {
  formatSessionListCandidateLabel,
  formatSessionSwitchCandidateLabel,
  type SessionListRow
} from "./session-summary"

const ITEM_ID_PREFIX = "bmxt-session-candidate-item"

export type SessionCandidatePanelVariant = "list" | "switch"

type Props = {
  rows: SessionListRow[]
  hi: number
  variant: SessionCandidatePanelVariant
}

export function SessionListCandidatePanel({ rows, hi, variant }: Props) {
  const uiCopy = useUiCopy()
  const listRef = useRef<HTMLDivElement>(null)
  const hintKey = variant === "switch" ? "session.switch.hint" : "session.picker.hint"
  const ariaKey = variant === "switch" ? "session.switch.aria" : "session.picker.aria"

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || rows.length === 0) {
      return
    }
    const clamped = Math.min(Math.max(0, hi), rows.length - 1)
    list.querySelector<HTMLElement>(`#${ITEM_ID_PREFIX}-${clamped}`)?.scrollIntoView({ block: "nearest" })
  }, [hi, rows.length])

  return (
    <div className="bmxt-subcmd-picker" role="listbox" aria-label={uiCopy.t(ariaKey)}>
      <div className="bmxt-subcmd-picker-hint">{uiCopy.t(hintKey)}</div>
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
            {variant === "switch"
              ? formatSessionSwitchCandidateLabel(row, rows)
              : formatSessionListCandidateLabel(row)}
          </div>
        ))}
      </div>
    </div>
  )
}
