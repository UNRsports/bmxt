/**
 * EN: First commands whose `-list` output can feed a pipe (`… -list | browse` / `| close` / …).
 * JA: `-list` 結果をパイプ左辺にできる第一コマンド。
 */

import { resolveCanonical } from "../../bmxt-core/registry"
import { PICKER_LIST_PRODUCER_TOKENS } from "../../picker/list-producers.ts"

const PIPE_PRODUCER_FIRST = new Set<string>(PICKER_LIST_PRODUCER_TOKENS)

/** EN: True when `token` is (or aliases to) a `-list` pipe producer first command. */
export function isPipeProducerFirstCommand(token: string): boolean {
  const trimmed = token.trim()
  if (trimmed.length === 0) {
    return false
  }
  const canonical = resolveCanonical(trimmed)
  if (canonical === null) {
    return false
  }
  return PIPE_PRODUCER_FIRST.has(canonical)
}

/**
 * EN: True when the active stage line already has a pipe-producer first command.
 * JA: 現在段の先頭トークンがパイプ可能な第一コマンドか。
 */
export function stageLineHasPipeProducerFirstCommand(stageLine: string): boolean {
  const parts = stageLine.trim().split(/\s+/).filter((part) => part.length > 0)
  if (parts.length === 0) {
    return false
  }
  return isPipeProducerFirstCommand(parts[0]!)
}
