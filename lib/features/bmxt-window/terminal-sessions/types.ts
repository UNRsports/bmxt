/**
 * 複数ターミナル（プロセス）のログ + 分割レイアウト。表示は TS、コマンド処理は Rust/WASM。
 */

import type { SplitLayoutV1 } from "../split-layout/types"

export type TerminalSessionsStateV1 = {
  v: 1
  logsById: Record<string, string[]>
  layout: SplitLayoutV1
}
