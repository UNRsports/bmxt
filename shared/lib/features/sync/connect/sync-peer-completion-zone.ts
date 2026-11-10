import { wordBounds } from "../../format/word-bounds.ts"

const DEVICE_ID_SUBCOMMANDS = new Set(["-connect", "-ping", "-open"])

export type SyncPeerCompletionZone = {
  tokenStart: number
  tokenEnd: number
  prefix: string
  subcommand: "-connect" | "-ping" | "-open"
}

/**
 * EN: When the caret is on the deviceId slot after `sync -connect` / `-ping` / `-open`.
 * JA: `sync -connect` / `-ping` / `-open` 直後の deviceId スロットにキャレットがあるとき。
 */
export function syncPeerDeviceCompletionZone(
  line: string,
  cursor: number
): SyncPeerCompletionZone | null {
  const [l, r] = wordBounds(line, cursor)
  const left = line.slice(0, l)
  const tokensBefore = left.trim().length > 0 ? left.trim().split(/\s+/) : []
  if (tokensBefore.length !== 2) {
    return null
  }
  // EN: `sync` has no short first-token alias in the registry.
  if (tokensBefore[0]!.toLowerCase() !== "sync") {
    return null
  }
  const second = tokensBefore[1]!.toLowerCase()
  if (!DEVICE_ID_SUBCOMMANDS.has(second)) {
    return null
  }
  return {
    tokenStart: l,
    tokenEnd: r,
    prefix: line.slice(l, cursor),
    subcommand: second as SyncPeerCompletionZone["subcommand"]
  }
}
