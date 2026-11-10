import type { ReactNode } from "react"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import { useSyncLinkStatus } from "./use-sync-link-status.ts"

export type SyncLinkStatusBarProps = {
  locale: UiLocale
}

/**
 * EN: Vim-like always-on strip listing WebRTC-connected peer browser names.
 * JA: WebRTC 接続中のブラウザ名を常時出す vim 風ステータス行。
 */
export function SyncLinkStatusBar(props: SyncLinkStatusBarProps): ReactNode {
  const status = useSyncLinkStatus()
  if (status.connectedPeers.length === 0) {
    return null
  }
  const names = status.connectedPeers.map((p) => p.displayName).join(", ")
  return (
    <div
      className="bmxt-sync-link-status"
      role="status"
      aria-live="polite"
      aria-label={tCmd("cmd.sync.link.statusLabel", props.locale)}>
      <span className="bmxt-sync-link-status-mark">--</span>
      <span className="bmxt-sync-link-status-body">
        {tCmd("cmd.sync.link.statusConnected", props.locale, { names })}
      </span>
      <span className="bmxt-sync-link-status-mark">--</span>
    </div>
  )
}
