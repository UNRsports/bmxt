/**
 * 複数ターミナルセッションのログ + アクティブ切り替え。表示は TS、コマンド処理は bmxt-core。
 */

export type TerminalSessionsStateV1 = {
  v: 2
  logsById: Record<string, string[]>
  /** 作成順（左が古い）。 */
  order: string[]
  activeId: string
}
