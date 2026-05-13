/**
 * 第一コマンドのみで Enter したあとの continuation（例: `tabs `）と、
 * 第二コマンド Tab 補完の正式トークン一覧の取得。
 *
 * 「第一＋固定第二」族を増やすときは `CONTINUATION_FIRST_COMMANDS` に 1 エントリ足し、
 * 第二トークン列挙は各コマンド側（`tabs/input`・`split-command-input` 等）で定義する。
 */

import { listSplitOptionCandidates } from "../bmxt-window/split-command-input"
import { listTabsOptionCandidates } from "../tabs/input"

export type ContinuationFirstCommandSpec = {
  /** マッチ用（小文字） */
  firstTokenLower: string
  /** プロンプト復帰文字列（末尾に半角スペース 1 つ） */
  continuationPrompt: string
  /** 第二トークン候補（`prefix` は入力途中の接頭辞） */
  listSecondCandidates: (prefix: string) => string[]
}

export const CONTINUATION_FIRST_COMMANDS: ContinuationFirstCommandSpec[] = [
  {
    firstTokenLower: "tabs",
    continuationPrompt: "tabs ",
    listSecondCandidates: listTabsOptionCandidates
  },
  {
    firstTokenLower: "split",
    continuationPrompt: "split ",
    listSecondCandidates: listSplitOptionCandidates
  }
]

const specByFirstTokenLower = new Map(
  CONTINUATION_FIRST_COMMANDS.map((s) => [s.firstTokenLower, s])
)

/** 先頭が単一トークンだけのとき continuation プロンプト、それ以外は null */
export function continuationPromptForFirstTokenOnly(trimmed: string): string | null {
  if (trimmed.includes(" ")) {
    return null
  }
  return specByFirstTokenLower.get(trimmed.toLowerCase())?.continuationPrompt ?? null
}

/** 先頭が単一トークンだけのとき、その第一コマンドの第二トークン候補（空プレフィックス＝全件） */
export function secondCommandCandidatesForFirstTokenOnly(trimmed: string): string[] {
  if (trimmed.includes(" ")) {
    return []
  }
  const spec = specByFirstTokenLower.get(trimmed.toLowerCase())
  return spec ? spec.listSecondCandidates("") : []
}
