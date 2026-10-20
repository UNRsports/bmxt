/**
 * EN: Chromium command smoke matrix (manifest first + one primary second each).
 *     Not a full flag/compound combinatorics table — see `_context/todo.md` §5.5.
 * JA: Chromium コマンド・スモーク行列（first＋主要 second 各1本）。
 *     フラグ／compound 完全組合せではない（`_context/todo.md` §5.5）。
 *
 * Keep rows aligned with `manifest/bmxt-codegen.json` canonical names.
 */

export type SmokeAssert =
  | "usage"
  | "log_ok"
  | "log_or_empty"
  | "picker"
  | "cleared"
  /** EN: Help text (may not use `usage:` prefix). */
  | "help_text"

export type SmokeTag = "needs_https" | "skip_ci_heavy" | "destructive" | "fsa" | "translator"

export type SmokeCase = {
  id: string
  line: string
  assert: SmokeAssert
  /** EN: Locale-stable substring expected in a log line (optional). */
  expectContains?: string
  tags?: SmokeTag[]
}

/**
 * EN: Initial smoke set (~20). Expand carefully — headed workers=1.
 * JA: 初期スモーク（約20）。headed workers=1 のため慎重に増やす。
 */
export const COMMAND_SMOKE_CASES: SmokeCase[] = [
  { id: "help", line: "help", assert: "log_ok" },
  { id: "clear", line: "clear", assert: "cleared" },
  { id: "aboutbmxt", line: "aboutbmxt", assert: "log_ok" },
  { id: "browse-bare", line: "browse", assert: "usage", expectContains: "usage:" },
  {
    id: "tab-help",
    line: "tab help",
    assert: "help_text",
    expectContains: "tab -list"
  },
  { id: "tab-list", line: "tab -list", assert: "log_or_empty" },
  {
    id: "setting-help",
    line: "setting help",
    assert: "help_text",
    expectContains: "setting"
  },
  {
    id: "setting-list",
    line: "setting -list",
    assert: "log_ok",
    expectContains: "setting"
  },
  {
    id: "session-help",
    line: "session help",
    assert: "help_text",
    expectContains: "session"
  },
  { id: "session-list", line: "session -list", assert: "log_ok" },
  {
    id: "search-help",
    line: "search help",
    assert: "help_text",
    expectContains: "search"
  },
  {
    id: "dom-help",
    line: "dom help",
    assert: "help_text",
    expectContains: "dom"
  },
  {
    id: "translate-help",
    line: "translate help",
    assert: "help_text",
    expectContains: "translate"
  },
  {
    id: "tutorial-help",
    line: "tutorial help",
    assert: "help_text",
    expectContains: "tutorial"
  },
  {
    id: "tab-list-browse",
    line: "tab -list | browse",
    assert: "picker"
  },
  {
    id: "search-list-page",
    line: "search -list --page example",
    assert: "log_or_empty",
    tags: ["needs_https"]
  },
  {
    id: "tab-nowurl",
    line: "tab -nowurl",
    assert: "log_ok",
    tags: ["needs_https"]
  },
  {
    id: "dom-list",
    line: "dom -list",
    assert: "log_or_empty",
    tags: ["needs_https"]
  }
]
