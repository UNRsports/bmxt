/**
 * EN: Search scopes that are independent and safe to run concurrently.
 * JA: 互いに独立で並行実行してよい検索スコープ。
 */

import type { ChromeEffect } from "../dispatch/effect-types.ts"

export function isParallelSearchEffect(e: ChromeEffect): boolean {
  return (
    e.kind === "search_history" ||
    e.kind === "search_bookmark" ||
    e.kind === "search_page" ||
    e.kind === "search_snapshot"
  )
}
