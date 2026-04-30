/**
 * WASM の `registry::all_completion_tokens()` と同一トークン。
 * 初期化失敗時の Tab 補完のみに使用（Rust: `cmd/*` / `registry/table` を変えたらここも合わせる）。
 */
export const FALLBACK_COMPLETION_CANDIDATES: string[] = [
  "?",
  "a",
  "activate",
  "b",
  "back",
  "c",
  "clear",
  "close",
  "echo",
  "focus",
  "forward",
  "fwd",
  "gls",
  "group",
  "groups",
  "help",
  "man",
  "move",
  "mv",
  "new",
  "tabs",
  "windows",
  "wins"
]
