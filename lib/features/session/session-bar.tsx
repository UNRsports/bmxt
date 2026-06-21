/** EN: tmux-style session name strip at the top of the BMXt window (2+ sessions). */

import { resolveSessionDisplayName } from "./session-summary"
import type { SessionPickerState } from "../side-picker/session/session-pickers"
import { useUiCopy } from "../setting"

type Props = {
  order: readonly string[]
  activeId: string
  namesById: Record<string, string | undefined>
  logsById: Record<string, string[] | undefined>
  pickersBySession: Record<string, SessionPickerState | undefined>
  navArmedByLeaf: Record<string, boolean>
  onActivateSession: (sessionId: string) => void
}

export function SessionBar({
  order,
  activeId,
  namesById,
  logsById,
  pickersBySession,
  navArmedByLeaf,
  onActivateSession
}: Props) {
  const uiCopy = useUiCopy()
  if (order.length < 2) {
    return null
  }

  return (
    <div className="bmxt-session-bar" role="tablist" aria-label={uiCopy.t("session.bar.aria")}>
      {order.map((sessionId, i) => {
        const index = i + 1
        const isActive = sessionId === activeId
        const label = resolveSessionDisplayName({
          sessionId,
          index,
          namesById,
          pickers: pickersBySession[sessionId],
          navArmed: navArmedByLeaf[sessionId] ?? false,
          logs: logsById[sessionId] ?? []
        })
        return (
          <button
            key={sessionId}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`bmxt-session-bar-tab${isActive ? " bmxt-session-bar-tab--active" : ""}`}
            onClick={() => onActivateSession(sessionId)}>
            <span className="bmxt-session-bar-tab-index">{index}</span>
            <span className="bmxt-session-bar-tab-label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
