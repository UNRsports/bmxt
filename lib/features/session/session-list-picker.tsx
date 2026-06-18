import type { SessionListRow } from "./session-summary"

type Props = {
  rows: SessionListRow[]
  hi: number
}

export function SessionListPickerPanel({ rows, hi }: Props) {
  return (
    <div className="bmxt-session-list-picker" role="listbox" aria-label="Sessions">
      {rows.map((row, i) => (
        <div
          key={row.sessionId}
          role="option"
          aria-selected={i === hi}
          className={`bmxt-session-list-picker-item${
            i === hi ? " bmxt-session-list-picker-item--hi" : ""
          }${row.isActive ? " bmxt-session-list-picker-item--active" : ""}`}>
          <span className="bmxt-session-list-picker-index">
            {row.isActive ? "*" : " "}
            {row.index}
          </span>
          <span className="bmxt-session-list-picker-summary">{row.summary}</span>
        </div>
      ))}
    </div>
  )
}
