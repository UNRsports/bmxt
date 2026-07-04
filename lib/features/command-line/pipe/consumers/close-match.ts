import type { ListRecordKind } from "../../list-output/types.ts"

const CLOSE_PIPE_RE = /^\s*(close|c)\s*$/i

export const CLOSE_ACCEPTS_KINDS: readonly ListRecordKind[] = ["tabs.tab"]

export function isClosePipeConsumer(segment: string): boolean {
  return CLOSE_PIPE_RE.test(segment.trim())
}
