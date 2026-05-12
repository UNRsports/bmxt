/**
 * 複数ターミナル（セッション）のログ状態。表示・永続化は TS、コマンド処理は Rust/WASM。
 */

export type TerminalSessionsStateV1 = {
  v: 1
  /** セッション ID → ログ行（末尾トリム済みを維持） */
  logsById: Record<string, string[]>
  /** 左から右のタブ順 */
  order: string[]
  /** フォーカス中のセッション */
  activeId: string
}
